const express = require('express');
const router = express.Router();
const multer = require('multer');

const {
  createExam,
  updateExam,
  deleteExam,
  getExams,
  getExamById,
  changeStatus,
  duplicateExam,
  uploadAndParsePDF,
} = require('../controllers/examController');

const { verifyToken, requireAdmin } = require('../middlewares/auth');

// Multer memory storage config for quick stream reading
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
});

// All routes require token verification and admin check
router.use(verifyToken);
router.use(requireAdmin);

router.get('/', getExams);
router.get('/:id', getExamById);
router.post('/', createExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);
router.put('/:id/status', changeStatus);
router.post('/:id/duplicate', duplicateExam);

// PDF Upload routes
router.post(
  '/upload-pdf',
  upload.fields([
    { name: 'questionPdf', maxCount: 1 },
    { name: 'answerPdf', maxCount: 1 }
  ]),
  uploadAndParsePDF
);

module.exports = router;
