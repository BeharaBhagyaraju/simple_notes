const Note = require('../models/Note');
const { ApiError } = require('../middlewares/errorHandler');

/**
 * @desc    Get user notes
 * @route   GET /api/notes
 * @access  Private
 */
const getNotes = async (req, res, next) => {
  try {
    const { search, filters } = req.query;

    // Base query: notes owned by the logged-in user
    let query = { user: req.user.id };

    // 1. General Search (fuzzy match on title or content)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { title: searchRegex },
        { 'regularData.content': searchRegex },
      ];
    }

    // 2. Dynamic Condition Builder Filters
    if (filters) {
      try {
        const parsedFilters = JSON.parse(filters);
        
        const orConditions = [];
        let currentAndArray = [];

        parsedFilters.forEach(f => {
          if (!f.value && f.field !== 'food') return;

          if (f.logic === 'OR' && currentAndArray.length > 0) {
            orConditions.push({ $and: currentAndArray });
            currentAndArray = [];
          }

          let conditionObj = null;

          if (f.field === 'name') {
            conditionObj = { 'wagesData.people.name': new RegExp(f.value, 'i') };
          } else if (f.field === 'type') {
            conditionObj = { type: f.value };
          } else if (f.field === 'food') {
            conditionObj = { 'wagesData.foodAmount': { $gt: 0 } };
          } else if (f.field === 'other' && f.value) {
            conditionObj = { 'wagesData.other.type': new RegExp(f.value, 'i') };
          } else if (f.field === 'date') {
            const d = new Date(f.value);
            if (!isNaN(d.getTime())) {
              if (f.operator === 'is') {
                const nextDay = new Date(d);
                nextDay.setDate(nextDay.getDate() + 1);
                conditionObj = { date: { $gte: d, $lt: nextDay } };
              } else if (f.operator === 'after') {
                conditionObj = { date: { $gt: d } };
              } else if (f.operator === 'before') {
                conditionObj = { date: { $lt: d } };
              }
            }
          }

          if (conditionObj) {
            currentAndArray.push(conditionObj);
          }
        });

        if (currentAndArray.length > 0) {
          orConditions.push({ $and: currentAndArray });
        }

        if (orConditions.length > 0) {
          if (query.$or) {
            query.$and = [{ $or: query.$or }, { $or: orConditions }];
            delete query.$or;
          } else {
            query.$or = orConditions;
          }
        }
      } catch (e) {
        console.error("Failed to parse filters", e);
      }
    }

    const notes = await Note.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: notes.length,
      data: notes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new note
 * @route   POST /api/notes
 * @access  Private
 */
const createNote = async (req, res, next) => {
  try {
    const { title, type, date, regularData, wagesData } = req.body;

    if (!title || !type) {
      return next(new ApiError(400, 'Please provide title and type'));
    }

    if (!['regular', 'wages'].includes(type)) {
      return next(new ApiError(400, 'Type must be regular or wages'));
    }

    let calculatedTotal = 0;
    if (type === 'wages' && wagesData) {
      const peopleSum = (wagesData.people || []).reduce((acc, curr) => acc + (Number(curr.money) || 0), 0);
      const foodSum = Number(wagesData.foodAmount) || 0;
      const otherSum = (wagesData.other || []).reduce((acc, curr) => acc + (Number(curr.money) || 0), 0);
      calculatedTotal = peopleSum + foodSum + otherSum;
      
      wagesData.totalAmount = calculatedTotal;
    }

    const note = await Note.create({
      user: req.user.id,
      title,
      type,
      date: date || Date.now(),
      regularData: type === 'regular' ? regularData : undefined,
      wagesData: type === 'wages' ? wagesData : undefined,
    });

    res.status(201).json({
      success: true,
      data: note,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update note
 * @route   PUT /api/notes/:id
 * @access  Private
 */
const updateNote = async (req, res, next) => {
  try {
    let note = await Note.findById(req.params.id);

    if (!note) {
      return next(new ApiError(404, 'Note not found'));
    }

    // Make sure user owns note
    if (note.user.toString() !== req.user.id) {
      return next(new ApiError(401, 'User not authorized to update this note'));
    }

    const { type, wagesData } = req.body;

    // Recalculate total if it's a wages note
    const updateData = { ...req.body };
    const noteType = type || note.type;
    
    if (noteType === 'wages') {
      const wagesToUse = wagesData || note.wagesData || {};
      const peopleSum = (wagesToUse.people || []).reduce((acc, curr) => acc + (Number(curr.money) || 0), 0);
      const foodSum = Number(wagesToUse.foodAmount) || 0;
      const otherSum = (wagesToUse.other || []).reduce((acc, curr) => acc + (Number(curr.money) || 0), 0);
      
      if (updateData.wagesData) {
        updateData.wagesData.totalAmount = peopleSum + foodSum + otherSum;
      }
    }

    note = await Note.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: note,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete note
 * @route   DELETE /api/notes/:id
 * @access  Private
 */
const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return next(new ApiError(404, 'Note not found'));
    }

    // Make sure user owns note
    if (note.user.toString() !== req.user.id) {
      return next(new ApiError(401, 'User not authorized to delete this note'));
    }

    await note.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Note removed'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
};
