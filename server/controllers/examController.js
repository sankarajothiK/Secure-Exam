const Exam = require('../models/Exam');
const { parseExamPDFs } = require('../services/pdfParser');

// Create Exam
const createExam = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      duration, 
      questions,
      hasAptitudeSection,
      hasCommunicationSection,
      communicationConfig
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Exam title is required.' });
    }

    const isAptitude = hasAptitudeSection !== undefined ? hasAptitudeSection : true;
    if (isAptitude && (!questions || !Array.isArray(questions) || questions.length === 0)) {
      return res.status(400).json({ message: 'Exam title and aptitude questions are required.' });
    }

    // Validate that each question has exactly 4 options and a correct answer A-D
    if (questions && Array.isArray(questions)) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.questionText || !q.options || q.options.length !== 4 || !['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
          return res.status(400).json({
            message: `Question at index ${i} is invalid. Make sure it has 4 options and a valid correct answer (A, B, C, or D).`,
          });
        }
      }
    }

    const newExam = new Exam({
      title,
      description,
      duration: duration || 20, // default 20 seconds
      questions: questions || [],
      hasAptitudeSection: isAptitude,
      hasCommunicationSection: hasCommunicationSection !== undefined ? hasCommunicationSection : false,
      communicationConfig: communicationConfig || {},
      createdBy: req.user.id,
      status: 'Inactive', // default starting status
    });

    await newExam.save();
    return res.status(201).json({ message: 'Exam Created Successfully', exam: newExam });
  } catch (error) {
    console.error('Create exam error:', error);
    return res.status(500).json({ message: 'Internal Server Error while creating exam' });
  }
};

// Update Exam
const updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      duration, 
      questions, 
      status,
      hasAptitudeSection,
      hasCommunicationSection,
      communicationConfig
    } = req.body;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (title) exam.title = title;
    if (description !== undefined) exam.description = description;
    if (duration !== undefined) exam.duration = duration;
    if (status) exam.status = status;
    if (hasAptitudeSection !== undefined) exam.hasAptitudeSection = hasAptitudeSection;
    if (hasCommunicationSection !== undefined) exam.hasCommunicationSection = hasCommunicationSection;
    if (communicationConfig !== undefined) {
      exam.communicationConfig = {
        ...exam.communicationConfig,
        ...communicationConfig
      };
    }

    if (questions && Array.isArray(questions)) {
      // Validate questions format
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.questionText || !q.options || q.options.length !== 4 || !['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
          return res.status(400).json({
            message: `Question at index ${i} is invalid. Make sure it has 4 options and a correct answer (A, B, C, D).`,
          });
        }
      }
      exam.questions = questions;
    }

    await exam.save();
    return res.status(200).json({ message: 'Exam Updated Successfully', exam });
  } catch (error) {
    console.error('Update exam error:', error);
    return res.status(500).json({ message: 'Internal Server Error while updating exam' });
  }
};

// Delete Exam
const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findByIdAndDelete(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    return res.status(200).json({ message: 'Exam Deleted Successfully' });
  } catch (error) {
    console.error('Delete exam error:', error);
    return res.status(500).json({ message: 'Internal Server Error while deleting exam' });
  }
};

// Get all exams (for Admin view)
const getExams = async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    return res.status(200).json(exams);
  } catch (error) {
    console.error('Get exams error:', error);
    return res.status(500).json({ message: 'Internal Server Error fetching exams' });
  }
};

// Get single exam by id
const getExamById = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    return res.status(200).json(exam);
  } catch (error) {
    console.error('Get exam by id error:', error);
    return res.status(500).json({ message: 'Internal Server Error fetching exam details' });
  }
};

// Toggle or manually set exam status
const changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Open, Closed, Inactive

    if (!['Open', 'Closed', 'Inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be Open, Closed, or Inactive.' });
    }

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    exam.status = status;
    await exam.save();

    return res.status(200).json({ message: `Exam status changed to ${status} successfully.`, exam });
  } catch (error) {
    console.error('Change status error:', error);
    return res.status(500).json({ message: 'Internal Server Error changing exam status' });
  }
};

// Duplicate Exam
const duplicateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const originalExam = await Exam.findById(id);
    if (!originalExam) {
      return res.status(404).json({ message: 'Original exam not found' });
    }

    const duplicatedExam = new Exam({
      title: `${originalExam.title} (Copy)`,
      description: originalExam.description,
      duration: originalExam.duration,
      questions: originalExam.questions.map(q => ({
        questionText: q.questionText,
        options: [...q.options],
        correctAnswer: q.correctAnswer,
      })),
      createdBy: req.user.id,
      status: 'Inactive',
    });

    await duplicatedExam.save();
    return res.status(201).json({ message: 'Exam Duplicated Successfully', exam: duplicatedExam });
  } catch (error) {
    console.error('Duplicate exam error:', error);
    return res.status(500).json({ message: 'Internal Server Error duplicating exam' });
  }
};

// PDF Upload and Parse Endpoint
const uploadAndParsePDF = async (req, res) => {
  try {
    if (!req.files || !req.files['questionPdf'] || !req.files['answerPdf']) {
      return res.status(400).json({ message: 'Please upload both Question PDF and Answer Key PDF.' });
    }

    const questionsFile = req.files['questionPdf'][0];
    const answersFile = req.files['answerPdf'][0];

    // Verify PDF MIME type
    if (questionsFile.mimetype !== 'application/pdf' || answersFile.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Uploaded files must be in PDF format.' });
    }

    // Call service to parse text streams
    const questionsList = await parseExamPDFs(questionsFile.buffer, answersFile.buffer);

    return res.status(200).json({
      message: 'Questions Extracted Successfully',
      questions: questionsList,
    });
  } catch (error) {
    console.error('PDF extraction route error:', error);
    return res.status(500).json({ message: error.message || 'Error occurred while parsing PDFs.' });
  }
};

module.exports = {
  createExam,
  updateExam,
  deleteExam,
  getExams,
  getExamById,
  changeStatus,
  duplicateExam,
  uploadAndParsePDF,
};
