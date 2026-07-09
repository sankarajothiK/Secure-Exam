const rateLimit = require('express-rate-limit');

// Rate limiting configurations
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 auth attempts per window
  message: { message: 'Too many login/registration attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mongo Injection Prevention Middleware
const mongoSanitize = (req, res, next) => {
  const clean = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          clean(obj[key]);
        }
      }
    }
  };
  clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
};

// Simple HTML/XSS Sanitizer for Strings
const xssSanitize = (req, res, next) => {
  const sanitizeStr = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };

  const traverseAndSanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeStr(obj[key]);
        } else if (typeof obj[key] === 'object') {
          traverseAndSanitize(obj[key]);
        }
      }
    }
  };

  traverseAndSanitize(req.body);
  traverseAndSanitize(req.query);
  traverseAndSanitize(req.params);
  next();
};

module.exports = {
  apiLimiter,
  authLimiter,
  mongoSanitize,
  xssSanitize,
};
