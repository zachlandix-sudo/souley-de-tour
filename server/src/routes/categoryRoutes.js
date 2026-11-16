const router = require('express').Router();
const c = require('../controllers/categoryController');
const v = require('../middleware/validators');
const validate = require('../middleware/validate');
const oid = require('../middleware/validateObjectId');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');

router.get('/', optionalAuth, c.list);
router.post('/', protect, restrictTo('admin'), v.category(false), validate, c.create);
router.put('/:id', protect, restrictTo('admin'), oid('id'), v.category(true), validate, c.update);
router.delete('/:id', protect, restrictTo('admin'), oid('id'), c.remove);

module.exports = router;
