require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');
const { apiLimiter, mongoSanitize, xssSanitize } = require('./middlewares/security');
const Admin = require('./models/Admin');

// Initialize Express App
const app = express();

// Security and utility Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // allows image resources to be loaded by frontend
}));
app.use(cors({
  origin: '*', // allows any origin in development/production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '15mb' })); // allows larger payloads (base64 selfies)
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Mongo & XSS Sanitization
app.use(mongoSanitize);
app.use(xssSanitize);

// Apply API Global Rate Limiting (except static assets)
app.use('/api', apiLimiter);

// Setup static directories and serve uploads
const uploadsDir = path.join(__dirname, 'uploads');
const selfiesDir = path.join(uploadsDir, 'selfies');
const aadhaarDir = path.join(uploadsDir, 'aadhaar');
const recordingsDir = path.join(uploadsDir, 'recordings');

[uploadsDir, selfiesDir, aadhaarDir, recordingsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

app.use('/uploads', express.static(uploadsDir));

// Route bindings
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employee', require('./routes/employee'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/communication', require('./routes/communication'));

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Admin Account Seeding on Boot
const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@examportal.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
    
    const adminExists = await Admin.findOne({ email: adminEmail });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      const newAdmin = new Admin({
        name: 'System Administrator',
        email: adminEmail,
        password: hashedPassword
      });
      
      await newAdmin.save();
      console.log(`Admin account seeded successfully: ${adminEmail}`);
    } else {
      console.log(`Admin account already exists: ${adminEmail}`);
    }
  } catch (error) {
    console.error('Error seeding admin account:', error.message);
  }
};

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File size too large. Maximum size allowed is 5MB.' });
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

// Port and Startup
const PORT = process.env.PORT || 5000;
const seedCommunicationQuestions = require('./seed/communicationQuestionsSeeder');

connectDB().then(() => {
  seedAdmin().then(() => {
    seedCommunicationQuestions().then(() => {
      app.listen(PORT, () => {
        console.log(`Server running in production-ready mode on port ${PORT}`);
      });
    });
  });
});
