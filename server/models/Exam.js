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
  hasAptitudeSection: {
    type: Boolean,
    default: true,
  },
  hasCommunicationSection: {
    type: Boolean,
    default: false,
  },
  communicationConfig: {
    totalMarks: {
      type: Number,
      default: 50,
    },
    passingMarks: {
      type: Number,
      default: 25,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    timePerQuestion: {
      type: Number,
      default: 30, // seconds for reading/prep
    },
    recordingDuration: {
      type: Number,
      default: 120, // seconds for speaking sections
    },
    selectedCategories: {
      type: [String],
      default: [
        'ListenRepeat',
        'ListeningComprehension',
        'ReadAloud',
        'TopicSpeaking',
        'PictureDescription',
        'SituationResponse',
        'ReadingComprehension',
        'Vocabulary',
        'Grammar',
        'EmailWriting',
        'ResumeIntroduction',
        'HRInterview'
      ]
    },
    randomizeQuestions: {
      type: Boolean,
      default: true,
    },
    questionCount: {
      type: Number,
      default: 12,
    }
  },
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
