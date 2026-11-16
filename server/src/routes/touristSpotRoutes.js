const router = require('express').Router();
const c = require('../controllers/touristSpotController');
const reviews = require('../controllers/reviewController');
const v = require('../middleware/validators');
const validate = require('../middleware/validate');
const oid = require('../middleware/validateObjectId');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');

router.get('/', optionalAuth, c.list);
router.post('/', protect, restrictTo('admin', 'editor'), v.touristSpot(false), validate, c.create);

// reviews nested
router.get('/:id/reviews', oid('id'), reviews.listForSpot);
router.post('/:id/reviews', protect, oid('id'), v.review, validate, reviews.create);

router.get('/:id', optionalAuth, c.getOne); // id OR slug
router.put('/:id', protect, restrictTo('admin', 'editor'), oid('id'), v.touristSpot(true), validate, c.update);
router.patch('/:id/status', protect, restrictTo('admin', 'editor'), oid('id'), c.setStatus);
router.delete('/:id', protect, restrictTo('admin'), oid('id'), c.remove);

module.exports = router;
