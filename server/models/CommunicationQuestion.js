const mongoose = require('mongoose');

const communicationQuestionSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: [
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
    ],
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true,
  },
  prompt: {
    type: String,
    required: true,
    trim: true,
  },
  audioUrl: {
    type: String,
    default: '',
  },
  imageUrl: {
    type: String,
    default: '',
  },
  options: {
    type: [String],
    default: undefined, // undefined allows empty array to be omitted or nullable
  },
  correctAnswer: {
    type: String,
    default: '',
  },
  story: {
    type: String,
    default: '',
  },
  isCustom: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Index categories for quick random queries
communicationQuestionSchema.index({ category: 1, difficulty: 1 });

module.exports = mongoose.model('CommunicationQuestion', communicationQuestionSchema);
