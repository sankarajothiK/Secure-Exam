const fs = require('fs');
const path = require('path');
const Employee = require('../models/Employee');
const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const CommunicationQuestion = require('../models/CommunicationQuestion');
const { generateSummary, evaluateAnswer } = require('../services/aiEvaluationService');

// Helper to save base64 image data to a file
const saveBase64Image = (base64Str, directory, filename) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, 'base64');
  const filePath = path.join(directory, filename);
  fs.writeFileSync(filePath, buffer);
  
  return `/uploads/${path.basename(directory)}/${filename}`;
};

// Get active open exams for Employee Dashboard
const getActiveExams = async (req, res) => {
  try {
    const exams = await Exam.find({ status: 'Open' }, '_id title description duration questions hasAptitudeSection hasCommunicationSection communicationConfig')
      .sort({ createdAt: -1 });

    const activeExams = exams.map(e => ({
      _id: e._id,
      title: e.title,
      description: e.description,
      duration: e.duration,
      questionsCount: e.questions.length,
      hasAptitudeSection: e.hasAptitudeSection,
      hasCommunicationSection: e.hasCommunicationSection,
      communicationConfig: e.communicationConfig || {},
    }));

    return res.status(200).json(activeExams);
  } catch (error) {
    console.error('Get active exams error:', error);
    return res.status(500).json({ message: 'Internal Server Error fetching active exams' });
  }
};

// Upload Employee Selfie
const uploadSelfie = async (req, res) => {
  try {
    const { image } = req.body; // base64 string
    const employeeId = req.user.id;

    if (!image) {
      return res.status(400).json({ message: 'No selfie image provided.' });
    }

    const dir = path.join(__dirname, '../uploads/selfies');
    const filename = `${employeeId}_selfie_${Date.now()}.png`;

    const relativePath = saveBase64Image(image, dir, filename);

    // Update Employee URL in DB
    await Employee.findByIdAndUpdate(employeeId, { selfieUrl: relativePath });

    return res.status(200).json({
      message: 'Selfie uploaded successfully',
      selfieUrl: relativePath,
    });
  } catch (error) {
    console.error('Selfie upload error:', error);
    return res.status(500).json({ message: 'Internal Server Error uploading selfie' });
  }
};

// Upload Aadhaar Card
const uploadAadhaar = async (req, res) => {
  try {
    const employeeId = req.user.id;
    let relativePath = '';

    if (req.body.image) {
      const dir = path.join(__dirname, '../uploads/aadhaar');
      const filename = `${employeeId}_aadhaar_${Date.now()}.png`;
      relativePath = saveBase64Image(req.body.image, dir, filename);
    } else if (req.file) {
      relativePath = `/uploads/aadhaar/${req.file.filename}`;
    } else {
      return res.status(400).json({ message: 'Please provide Aadhaar card image.' });
    }

    // Update Employee URL in DB
    await Employee.findByIdAndUpdate(employeeId, { aadhaarUrl: relativePath });

    return res.status(200).json({
      message: 'Aadhaar Card uploaded successfully',
      aadhaarUrl: relativePath,
    });
  } catch (error) {
    console.error('Aadhaar upload error:', error);
    return res.status(500).json({ message: 'Internal Server Error uploading Aadhaar card' });
  }
};

// Submit Exam Attempt and Auto Evaluate Score
const submitExamAttempt = async (req, res) => {
  try {
    const { 
      examId, 
      answers, 
      communicationAnswers, 
      tabSwitchCount, 
      status, 
      reason, 
      startedAt 
    } = req.body;
    const employeeId = req.user.id;

    if (!examId || !status) {
      return res.status(400).json({ message: 'Exam ID and completion status are required.' });
    }

    // Verify employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee profile not found.' });
    }

    if (!employee.selfieUrl || !employee.aadhaarUrl) {
      return res.status(400).json({ message: 'Verification requirements incomplete. Selfie and Aadhaar are mandatory.' });
    }

    const existingAttempt = await ExamAttempt.findOne({ employee: employeeId, exam: examId });
    if (existingAttempt) {
      return res.status(400).json({ message: 'You have already submitted this examination.' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    // 1. Grade Aptitude MCQs if present
    let score = 0;
    let totalQuestions = 0;
    const gradedAnswers = [];

    if (exam.hasAptitudeSection) {
      totalQuestions = exam.questions.length;
      for (let i = 0; i < totalQuestions; i++) {
        const question = exam.questions[i];
        const employeeAnsObj = answers ? answers.find(a => a.questionIndex === i) : null;
        const selectedOption = employeeAnsObj ? employeeAnsObj.selectedOption : '';
        
        const isCorrect = selectedOption.toUpperCase() === question.correctAnswer.toUpperCase();
        if (isCorrect && selectedOption !== '') {
          score += 1;
        }

        gradedAnswers.push({
          questionIndex: i,
          selectedOption: selectedOption,
          isCorrect: isCorrect,
        });
      }
    }

    // 2. Compile Communication Scores if present
    let commScore = 0;
    let summary = {
      cefrLevel: 'A1',
      strengths: [],
      weaknesses: [],
      improvementSuggestions: [],
      overallFeedback: 'No communication section present.'
    };

    if (exam.hasCommunicationSection && communicationAnswers && communicationAnswers.length > 0) {
      for (const ans of communicationAnswers) {
        if (!ans.aiMetrics || !ans.aiMetrics.accuracyScore) {
          const q = await CommunicationQuestion.findById(ans.questionId);
          const promptText = q ? q.prompt : '';
          ans.aiMetrics = evaluateAnswer(ans.category, promptText, ans, q);
        }
      }
      summary = generateSummary(communicationAnswers, exam.communicationConfig.totalMarks);
      commScore = Math.round((summary.overallPercentage / 100) * exam.communicationConfig.totalMarks);
    }

    // Overall final score combining both sections
    const overallFinalScore = score + commScore;

    // Create unified exam attempt record
    const attempt = new ExamAttempt({
      employee: employeeId,
      exam: examId,
      answers: gradedAnswers,
      score, // Aptitude Score
      totalQuestions, // Aptitude Questions
      communicationScore: commScore,
      overallScore: overallFinalScore,
      isCommunicationEvaluated: exam.hasCommunicationSection,
      communicationAnswers: communicationAnswers || [],
      aiSummary: {
        cefrLevel: summary.cefrLevel,
        strengths: summary.strengths,
        weaknesses: summary.weaknesses,
        improvementSuggestions: summary.improvementSuggestions,
        overallFeedback: summary.overallFeedback
      },
      tabSwitchCount: tabSwitchCount || 0,
      status: status,
      reason: reason || '',
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      submittedAt: new Date(),
    });

    await attempt.save();

    return res.status(200).json({
      message: 'Exam Submitted Successfully',
    });
  } catch (error) {
    console.error('Exam submission error:', error);
    return res.status(500).json({ message: 'Internal Server Error during exam submission' });
  }
};

// Securely get exam questions for employee (hiding correctAnswers)
const getExamQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findOne({ _id: id, status: 'Open' });
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found or is currently closed.' });
    }

    const existingAttempt = await ExamAttempt.findOne({ employee: req.user.id, exam: id });
    if (existingAttempt) {
      return res.status(400).json({ message: 'You have already attempted this exam.' });
    }

    const sanitizedQuestions = exam.questions.map((q, index) => ({
      questionIndex: index,
      questionText: q.questionText,
      options: q.options,
    }));

    return res.status(200).json({
      _id: exam._id,
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      questions: sanitizedQuestions,
    });
  } catch (error) {
    console.error('Get exam questions error:', error);
    return res.status(500).json({ message: 'Internal Server Error loading exam questions' });
  }
};

module.exports = {
  getActiveExams,
  uploadSelfie,
  uploadAadhaar,
  submitExamAttempt,
  getExamQuestions,
};
