const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  getQuestionsForExam,
  uploadAudio,
  createCustomQuestion,
  getQuestionBank
} = require('../controllers/communicationController');

const { verifyToken, requireEmployee, requireAdmin } = require('../middlewares/auth');

// Multer disk storage config for student recordings
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/recordings');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'rec-' + uniqueSuffix + '.webm'); // standard webm media container
  }
});

const uploadAudioFile = multer({
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for speech
});

// Multer storage for admin custom question media assets
const adminMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isAudio = file.fieldname === 'audioFile';
    const folderName = isAudio ? 'recordings' : 'aadhaar'; // reuse folders
    const dir = path.join(__dirname, `../uploads/${folderName}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'asset-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadAdminFiles = multer({
  storage: adminMediaStorage
}).fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'imageFile', maxCount: 1 }
]);

// --- Endpoints ---

// Student routes (require token verification and employee check)
router.get('/exam/:examId', verifyToken, requireEmployee, getQuestionsForExam);
router.post('/upload-audio', verifyToken, requireEmployee, uploadAudioFile.single('audio'), uploadAudio);

// Admin routes (require token verification and admin check)
router.get('/admin/questions', verifyToken, requireAdmin, getQuestionBank);
router.post('/admin/custom-question', verifyToken, requireAdmin, uploadAdminFiles, createCustomQuestion);

module.exports = router;
