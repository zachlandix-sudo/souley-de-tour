const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken, cookieOptions } = require('../utils/token');

const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;

// The token lives only in the httpOnly cookie. It is not returned in the body.
const sendAuth = (res, user, status = 200) => {
  res.cookie('token', signToken(user), cookieOptions());
  res.status(status).json({ success: true, data: user });
};

exports.register = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;
  if (await User.findOne({ email })) throw new AppError('Email already registered.', 409);
  // role NEVER from body. always visitor.
  const user = await User.create({
    fullName,
    email,
    passwordHash: await User.hashPassword(password),
    role: 'visitor',
  });
  sendAuth(res, user, 201);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');

  if (user && user.lockUntil && user.lockUntil > Date.now()) {
    const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new AppError(`Too many failed attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`, 429);
  }

  // same message for bad email / bad password
  if (!user || !(await user.comparePassword(password))) {
    if (user) {
      user.failedLoginCount = (user.failedLoginCount || 0) + 1;
      if (user.failedLoginCount >= MAX_FAILED_LOGINS) {
        user.lockUntil = new Date(Date.now() + LOCK_MS);
        user.failedLoginCount = 0;
      }
      await user.save();
    }
    throw new AppError('Invalid email or password.', 401);
  }

  if (user.status === 'suspended') throw new AppError('Account suspended.', 403);
  user.failedLoginCount = 0;
  user.lockUntil = undefined;
  user.lastLogin = new Date();
  await user.save();
  sendAuth(res, user);
});

exports.logout = (_req, res) => {
  res.clearCookie('token', cookieOptions());
  res.json({ success: true, message: 'Logged out.' });
};

exports.me = (req, res) => res.json({ success: true, data: req.user });

// Change password. Every other session is signed out; this one gets a fresh cookie.
exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.comparePassword(req.body.currentPassword))) throw new AppError('Current password is incorrect.', 400);
  user.passwordHash = await User.hashPassword(req.body.newPassword);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  sendAuth(res, user);
});

// Sign out of every device, including this one.
exports.logoutAll = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.clearCookie('token', cookieOptions());
  res.json({ success: true, message: 'Logged out everywhere.' });
});
