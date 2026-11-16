const router = require('express').Router();
const c = require('../controllers/itineraryController');
const v = require('../middleware/validators');
const validate = require('../middleware/validate');
const oid = require('../middleware/validateObjectId');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', c.list);
router.post('/', v.itinerary, validate, c.create);
router.get('/:id', oid('id'), c.getOne);
router.put('/:id', oid('id'), v.itinerary, validate, c.update);
router.delete('/:id', oid('id'), c.remove);

module.exports = router;
