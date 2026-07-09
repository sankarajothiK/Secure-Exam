const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access Denied: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_123456');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Access Denied: Invalid token' });
  }
};

const requireEmployee = (req, res, next) => {
  if (!req.user || req.user.role !== 'employee') {
    return res.status(403).json({ message: 'Access Denied: Employee privileges required' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access Denied: Admin privileges required' });
  }
  next();
};

module.exports = {
  verifyToken,
  requireEmployee,
  requireAdmin,
};
