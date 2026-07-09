const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  getResults,
  getResultDetails,
  exportResultsCSV,
} = require('../controllers/adminController');

const { verifyToken, requireAdmin } = require('../middlewares/auth');

// All admin routes require token verification and admin check
router.use(verifyToken);
router.use(requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/results', getResults);
router.get('/results/export-csv', exportResultsCSV);
router.get('/results/:id', getResultDetails);

module.exports = router;
