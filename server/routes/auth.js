const express = require('express');
const router = express.Router();
const { registerEmployee, loginEmployee, loginAdmin } = require('../controllers/authController');
const { authLimiter } = require('../middlewares/security');

router.post('/register', authLimiter, registerEmployee);
router.post('/login', authLimiter, loginEmployee);
router.post('/admin/login', authLimiter, loginAdmin);

module.exports = router;
