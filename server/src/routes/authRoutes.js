const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/authController');
const v = require('../middleware/validators');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const limiter = (windowMs, max, extra = {}) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts. Try later.' }, ...extra });

const loginLimiter = limiter(15 * 60 * 1000, 10, { skipSuccessfulRequests: true }); // only failed logins count
const registerLimiter = limiter(60 * 60 * 1000, 20);
const passwordLimiter = limiter(15 * 60 * 1000, 10, { skipSuccessfulRequests: true });

router.post('/register', registerLimiter, v.register, validate, c.register);
router.post('/login', loginLimiter, v.login, validate, c.login);
router.post('/logout', c.logout);
router.post('/logout-all', protect, c.logoutAll);
router.patch('/password', protect, passwordLimiter, v.changePassword, validate, c.changePassword);
router.get('/me', protect, c.me);

module.exports = router;
