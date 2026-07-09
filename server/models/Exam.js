const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  duration: {
    type: Number,
    default: 20, // default time in seconds per question
  },
  status: {
    type: String,
    enum: ['Inactive', 'Open', 'Closed'],
    default: 'Inactive',
  },
  questions: [{
    questionText: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      required: true,
      validate: [opts => opts.length === 4, 'An MCQ must have exactly 4 options'],
    },
    correctAnswer: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
      required: true,
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Exam', examSchema);
