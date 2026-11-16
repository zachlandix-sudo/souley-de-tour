const router = require('express').Router();
const { summary, statistics } = require('../controllers/dashboardController');
const c = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/dashboard', protect, restrictTo('admin', 'editor'), summary);
router.get('/statistics', protect, restrictTo('admin', 'editor'), statistics);

// content health, bulk spot actions and exports are for staff; the action log and bulk review actions are admin only.
// (exports check the role per list inside the controller: editors may export spots only)
router.get('/health', protect, restrictTo('admin', 'editor'), c.health);
router.post('/spots/bulk', protect, restrictTo('admin', 'editor'), c.bulkSpots);
router.post('/reviews/bulk', protect, restrictTo('admin'), c.bulkReviews);
router.get('/activity', protect, restrictTo('admin'), c.activity);
router.get('/export/:kind', protect, restrictTo('admin', 'editor'), c.exportCsv);

module.exports = router;
