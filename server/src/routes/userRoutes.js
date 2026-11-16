const router = require('express').Router();
const c = require('../controllers/userController');
const pc = require('../controllers/passportController');
const v = require('../middleware/validators');
const validate = require('../middleware/validate');
const oid = require('../middleware/validateObjectId');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

// favorites (self)  - must be BEFORE /:id
router.get('/me/favorites', c.getFavorites);
router.post('/me/favorites/:touristSpotId', oid('touristSpotId'), c.addFavorite);
router.delete('/me/favorites/:touristSpotId', oid('touristSpotId'), c.removeFavorite);

// my journey (self) - also before /:id, or "me" would be read as a user id
router.get('/me/overview', c.myOverview);

// Leyte Passport (self) - also before /:id
router.get('/me/passport/stamps', pc.getStamps);
router.put('/me/passport/stamps', v.passportMerge, validate, pc.mergeStamps);
router.post('/me/passport/stamps/:touristSpotId', oid('touristSpotId'), v.passportStamp, validate, pc.addStamp);
router.delete('/me/passport/stamps/:touristSpotId', oid('touristSpotId'), pc.removeStamp);
router.patch('/me/passport', v.passportProfile, validate, pc.updateProfile);

// admin user management
router.get('/', restrictTo('admin'), c.list);
router.get('/:id', restrictTo('admin'), oid('id'), c.getOne);
router.get('/:id/overview', restrictTo('admin'), oid('id'), c.overview);
router.post('/:id/force-logout', restrictTo('admin'), oid('id'), c.forceLogout);
router.post('/:id/unlock', restrictTo('admin'), oid('id'), c.unlock);
router.patch('/:id', restrictTo('admin'), oid('id'), c.update);
router.delete('/:id', restrictTo('admin'), oid('id'), c.remove);

module.exports = router;
