const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/aiController');
const v = require('../middleware/validators');
const validate = require('../middleware/validate');
const { protect, optionalAuth } = require('../middleware/auth');

const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many AI requests. Slow down.' } });

router.post('/recommendations', aiLimiter, optionalAuth, v.aiQuery, validate, c.recommendations);
router.post('/itinerary', aiLimiter, optionalAuth, v.aiQuery, validate, c.itinerary);
router.get('/conversations', protect, c.conversations);

module.exports = router;
