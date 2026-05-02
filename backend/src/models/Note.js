const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Please specify note type'],
      enum: ['regular', 'wages'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    // Data specific to 'regular' type notes
    regularData: {
      content: {
        type: String,
        default: '',
      },
    },
    // Data specific to 'wages' type notes
    wagesData: {
      people: [
        {
          name: String,
          money: Number,
        },
      ],
      foodAmount: {
        type: Number,
        default: 0,
      },
      other: [
        {
          type: { type: String }, // e.g., "transport", "materials"
          money: Number,
        },
      ],
      totalAmount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Note', noteSchema);
