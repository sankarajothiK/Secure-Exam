const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const Admin = require('../models/Admin');

// Validate email helper
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Validate mobile helper
const validateMobile = (mobile) => {
  return /^\+?[1-9]\d{1,14}$/.test(mobile.replace(/[\s-]/g, '')) && mobile.length >= 10;
};

// Employee Registration
const registerEmployee = async (req, res) => {
  try {
    const { name, mobile, email, password, confirmPassword } = req.body;

    if (!name || !mobile || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email address format' });
    }

    if (!validateMobile(mobile)) {
      return res.status(400).json({ message: 'Invalid mobile number (Must be at least 10 digits)' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords and Confirm Password do not match' });
    }

    // Check duplicate email
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Email address is already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create employee
    const employee = new Employee({
      name,
      mobile,
      email,
      password: hashedPassword,
    });

    await employee.save();

    return res.status(201).json({
      message: 'Registration Successful. Please Login.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal Server Error during registration' });
  }
};

// Employee Login
const loginEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    // Sign token
    const token = jwt.sign(
      { id: employee._id, role: 'employee', name: employee.name },
      process.env.JWT_SECRET || 'fallback_secret_key_123456',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login Successful',
      token,
      user: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        mobile: employee.mobile,
        selfieUrl: employee.selfieUrl,
        aadhaarUrl: employee.aadhaarUrl,
        role: 'employee',
      },
    });
  } catch (error) {
    console.error('Employee login error:', error);
    return res.status(500).json({ message: 'Internal Server Error during employee login' });
  }
};

// Admin Login
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    // Sign token
    const token = jwt.sign(
      { id: admin._id, role: 'admin', name: admin.name },
      process.env.JWT_SECRET || 'fallback_secret_key_123456',
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Login Successful',
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ message: 'Internal Server Error during admin login' });
  }
};

module.exports = {
  registerEmployee,
  loginEmployee,
  loginAdmin,
};
