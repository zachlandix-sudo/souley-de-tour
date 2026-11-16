const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/photoController');

// Cached on the server, but the route still reaches paid / limited photo APIs on a miss, so keep one visitor from spamming it.
const photoLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many photo requests. Slow down.' } });

router.get('/', photoLimiter, c.search);

module.exports = router;
