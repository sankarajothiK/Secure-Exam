const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  getActiveExams,
  uploadSelfie,
  uploadAadhaar,
  submitExamAttempt,
  getExamQuestions,
} = require('../controllers/employeeController');

const { verifyToken, requireEmployee } = require('../middlewares/auth');

// Multer disk storage config for Aadhaar file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/aadhaar');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.id + '-aadhaar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG, JPG, and PNG images are allowed.'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit
});

// All employee routes require token verification and employee check
router.use(verifyToken);
router.use(requireEmployee);

router.get('/active-exams', getActiveExams);
router.get('/exams/:id', getExamQuestions);
router.post('/upload-selfie', uploadSelfie);
router.post('/upload-aadhaar', upload.single('aadhaarFile'), uploadAadhaar);
router.post('/submit-exam', submitExamAttempt);

module.exports = router;
