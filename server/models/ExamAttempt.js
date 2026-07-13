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
  communicationScore: {
    type: Number,
    default: 0,
  },
  overallScore: {
    type: Number,
    default: 0,
  },
  isCommunicationEvaluated: {
    type: Boolean,
    default: false,
  },
  communicationAnswers: [{
    category: {
      type: String,
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunicationQuestion',
    },
    prompt: {
      type: String,
      default: '',
    },
    audioPath: {
      type: String,
      default: '',
    },
    emailText: {
      type: String,
      default: '',
    },
    mcqAnswer: {
      type: String,
      default: '',
    },
    transcript: {
      type: String,
      default: '',
    },
    aiMetrics: {
      accuracyScore: { type: Number, default: 0 },
      pronunciationScore: { type: Number, default: 0 },
      fluencyScore: { type: Number, default: 0 },
      confidenceScore: { type: Number, default: 0 },
      grammarScore: { type: Number, default: 0 },
      vocabularyScore: { type: Number, default: 0 },
      fillerWordCount: { type: Number, default: 0 },
      speakingWpm: { type: Number, default: 0 },
      missingWords: [String],
      extraWords: [String],
      mispronouncedWords: [String],
      feedback: { type: String, default: '' },
    }
  }],
  aiSummary: {
    cefrLevel: { type: String, default: 'A1' },
    strengths: [String],
    weaknesses: [String],
    improvementSuggestions: [String],
    overallFeedback: { type: String, default: '' },
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
