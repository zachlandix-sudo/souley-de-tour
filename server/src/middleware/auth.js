const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const readToken = (req) => {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  return req.cookies && req.cookies.token;
};

// must be logged in
const protect = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (!token) throw new AppError('Please log in first.', 401);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError('Session invalid or expired.', 401);
  }
  const user = await User.findById(payload.id);
  if (!user) throw new AppError('Account no longer exists.', 401);
  if ((payload.tv ?? 0) !== (user.tokenVersion || 0)) throw new AppError('Session invalid or expired.', 401);
  if (user.status === 'suspended') throw new AppError('Account suspended.', 403);
  req.user = user;
  next();
});

// login optional (public route that can know the user)
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (user && user.status === 'active' && (payload.tv ?? 0) === (user.tokenVersion || 0)) req.user = user;
    } catch {
      /* ignore bad token on public route */
    }
  }
  next();
});

const restrictTo = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to do this.', 403));
  }
  next();
};

module.exports = { protect, optionalAuth, restrictTo };
