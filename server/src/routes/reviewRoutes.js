const router = require('express').Router();
const c = require('../controllers/reviewController');
const v = require('../middleware/validators');
const validate = require('../middleware/validate');
const oid = require('../middleware/validateObjectId');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.get('/', restrictTo('admin'), c.listAll);
router.put('/:id', oid('id'), v.review, validate, c.update);
router.delete('/:id', oid('id'), c.remove);
router.patch('/:id/status', restrictTo('admin'), oid('id'), c.setStatus);

module.exports = router;
