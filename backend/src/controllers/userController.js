const User = require('../models/User');
const Note = require('../models/Note');
const ResetRequest = require('../models/ResetRequest');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');
const { ApiError } = require('../middlewares/errorHandler');

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id) {
      return next(new ApiError(400, 'You cannot delete your own account'));
    }

    // Delete user's notes
    await Note.deleteMany({ user: user._id });

    // Delete user
    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User and their associated notes have been deleted',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user details & stats
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
const getUserDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return next(new ApiError(404, 'User not found'));

    const notesCount = await Note.countDocuments({ user: user._id });
    const wagesNotesCount = await Note.countDocuments({ user: user._id, type: 'wages' });

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          totalNotes: notesCount,
          wagesNotes: wagesNotesCount,
          regularNotes: notesCount - wagesNotesCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get pending reset requests
 * @route   GET /api/users/reset-requests
 * @access  Private/Admin
 */
const getResetRequests = async (req, res, next) => {
  try {
    const requests = await ResetRequest.find({ status: 'pending' }).populate('user', 'name email');
    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve reset request
 * @route   PUT /api/users/reset-requests/:id/approve
 * @access  Private/Admin
 */
const approveResetRequest = async (req, res, next) => {
  try {
    const request = await ResetRequest.findById(req.params.id).populate('user');
    if (!request) return next(new ApiError(404, 'Request not found'));
    
    if (request.status === 'resolved') {
      return next(new ApiError(400, 'Request already resolved'));
    }

    const tempPassword = Math.random().toString(36).slice(-8); // Generate 8 char password
    
    const user = await User.findById(request.user._id);
    user.password = tempPassword; // Will be hashed by pre-save
    await user.save();

    request.status = 'resolved';
    await request.save();

    // Send Email
    const message = `Your password has been reset by an Administrator. Your new temporary password is: ${tempPassword}. Please log in and change it immediately.`;
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0F172A; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
        <div style="background: linear-gradient(135deg, #6366F1, #818CF8); padding: 32px 24px; text-align: center;">
          <h1 style="color: #FFFFFF; margin: 0; font-size: 24px;">🔐 Password Reset</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Simple Notes</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #E2E8F0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
            Hello <strong>${user.name}</strong>,
          </p>
          <p style="color: #94A3B8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Your password has been reset by an Administrator. Use the temporary password below to log in:
          </p>
          <div style="background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
            <p style="color: #94A3B8; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Your Temporary Password</p>
            <p style="color: #818CF8; font-size: 28px; font-weight: bold; margin: 0; letter-spacing: 3px; font-family: monospace;">${tempPassword}</p>
          </div>
          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 14px; margin: 0 0 24px;">
            <p style="color: #FBBF24; font-size: 13px; margin: 0;">
              ⚠️ <strong>Important:</strong> Please log in and change this password immediately using the "Change Password" option in your profile menu.
            </p>
          </div>
          <p style="color: #64748B; font-size: 13px; margin: 0; text-align: center;">
            If you didn't request this reset, please contact the administrator immediately.
          </p>
        </div>
        <div style="background: #1E293B; padding: 16px 24px; text-align: center; border-top: 1px solid #334155;">
          <p style="color: #475569; font-size: 12px; margin: 0;">© Simple Notes App</p>
        </div>
      </div>
    `;
    
    if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your-email@gmail.com') {
      await sendEmail({
        email: user.email,
        subject: 'Simple Notes - Password Reset Approved',
        message,
        html,
      });
    } else {
      console.log(`\n==== DEV MODE: New password for ${user.email} is ${tempPassword} ====\n`);
    }

    res.status(200).json({
      success: true,
      message: 'Reset approved and email sent',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create notification
 * @route   POST /api/users/notifications
 * @access  Private/Admin
 */
const createNotification = async (req, res, next) => {
  try {
    const { title, message, userId } = req.body;
    if (!title || !message) return next(new ApiError(400, 'Please provide title and message'));

    const notification = await Notification.create({
      title,
      message,
      user: userId || null, // null means global
    });

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  deleteUser,
  getUserDetails,
  getResetRequests,
  approveResetRequest,
  createNotification,
};
