const mongoose = require('mongoose');

const examAttemptSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
  },
  answers: [{
    questionIndex: {
      type: Number,
      required: true,
    },
    selectedOption: {
      type: String,
      enum: ['A', 'B', 'C', 'D', ''], // empty string for skipped or auto-advanced questions
    },
    isCorrect: {
      type: Boolean,
      default: false,
    }
  }],
  score: {
    type: Number,
    required: true,
    default: 0,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  tabSwitchCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Completed', 'Terminated'],
    required: true,
  },
  reason: {
    type: String,
    default: '',
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);
