const fs = require('fs');
const path = require('path');
const CommunicationQuestion = require('../models/CommunicationQuestion');
const Exam = require('../models/Exam');
const { evaluateAnswer } = require('../services/aiEvaluationService');

// Get communication questions for student exam attempt
const getQuestionsForExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (!exam.hasCommunicationSection) {
      return res.status(400).json({ message: 'This exam does not contain a communication section' });
    }

    const { difficulty, selectedCategories, questionCount, randomizeQuestions } = exam.communicationConfig;

    const questions = [];

    // Helper: Get random questions per category
    for (const category of selectedCategories) {
      let categoryQuestions = [];
      
      if (randomizeQuestions) {
        // Random sampling via Aggregation
        categoryQuestions = await CommunicationQuestion.aggregate([
          { $match: { category, difficulty } },
          { $sample: { size: 1 } }
        ]);

        // Fallback to any difficulty if no matches
        if (categoryQuestions.length === 0) {
          categoryQuestions = await CommunicationQuestion.aggregate([
            { $match: { category } },
            { $sample: { size: 1 } }
          ]);
        }
      } else {
        // Fetch static questions
        categoryQuestions = await CommunicationQuestion.find({ category, difficulty }).limit(1);
        if (categoryQuestions.length === 0) {
          categoryQuestions = await CommunicationQuestion.find({ category }).limit(1);
        }
      }

      if (categoryQuestions.length > 0) {
        questions.push(categoryQuestions[0]);
      }
    }

    // Limit to questionCount if needed, or shuffle
    const slicedQuestions = questions.slice(0, questionCount).map(q => ({
      _id: q._id,
      category: q.category,
      difficulty: q.difficulty,
      prompt: q.prompt,
      audioUrl: q.audioUrl,
      imageUrl: q.imageUrl,
      options: q.options,
      story: q.story,
    }));

    return res.status(200).json(slicedQuestions);
  } catch (error) {
    console.error('Fetch communication questions error:', error);
    return res.status(500).json({ message: 'Internal Server Error loading communication questions' });
  }
};

// Upload candidate audio and run real-time evaluation
const uploadAudio = async (req, res) => {
  try {
    const { category, questionId, prompt, transcript } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No audio file uploaded.' });
    }

    const relativePath = `/uploads/recordings/${req.file.filename}`;

    // Look up question details for MCQs/prompts if needed
    let questionDetails = {};
    if (questionId) {
      const q = await CommunicationQuestion.findById(questionId);
      if (q) questionDetails = q;
    }

    // Run AI Evaluation
    const aiMetrics = evaluateAnswer(
      category,
      prompt || questionDetails.prompt || '',
      { transcript },
      questionDetails
    );

    return res.status(200).json({
      message: 'Audio uploaded and evaluated successfully',
      audioPath: relativePath,
      transcript: transcript || '',
      aiMetrics
    });
  } catch (error) {
    console.error('Audio upload error:', error);
    return res.status(500).json({ message: 'Internal Server Error processing candidate recording' });
  }
};

// Create a custom communication question (Admin)
const createCustomQuestion = async (req, res) => {
  try {
    const { category, difficulty, prompt, options, correctAnswer, story } = req.body;
    let audioUrl = '';
    let imageUrl = '';

    // Handle files if uploaded
    if (req.files) {
      if (req.files.audioFile && req.files.audioFile[0]) {
        audioUrl = `/uploads/recordings/${req.files.audioFile[0].filename}`;
      }
      if (req.files.imageFile && req.files.imageFile[0]) {
        imageUrl = `/uploads/aadhaar/${req.files.imageFile[0].filename}`; // reuse image folder
      }
    }

    let parsedOptions = options;
    if (typeof options === 'string') {
      try {
        parsedOptions = JSON.parse(options);
      } catch (e) {
        parsedOptions = options.split(',').map(o => o.trim());
      }
    }

    const question = new CommunicationQuestion({
      category,
      difficulty,
      prompt,
      options: parsedOptions,
      correctAnswer,
      story,
      audioUrl,
      imageUrl,
      isCustom: true
    });

    await question.save();

    return res.status(201).json({
      message: 'Custom question created successfully',
      question
    });
  } catch (error) {
    console.error('Create custom question error:', error);
    return res.status(500).json({ message: 'Internal Server Error creating custom question' });
  }
};

// Get all communication questions for Admin management panel
const getQuestionBank = async (req, res) => {
  try {
    const { search, category, difficulty } = req.query;
    let filter = {};

    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (search && search.trim() !== '') {
      filter.prompt = new RegExp(search.trim(), 'i');
    }

    const list = await CommunicationQuestion.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(list);
  } catch (error) {
    console.error('Get question bank error:', error);
    return res.status(500).json({ message: 'Internal Server Error loading question bank' });
  }
};

module.exports = {
  getQuestionsForExam,
  uploadAudio,
  createCustomQuestion,
  getQuestionBank
};
