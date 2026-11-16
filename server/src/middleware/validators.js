const { body } = require('express-validator');
const { MAX_STAMPS, PASSPORT_COLORS, METHODS } = require('../utils/passport');

const register = [
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters.'),
  body('email').trim().isEmail().withMessage('Valid email required.').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('confirmPassword')
    .custom((v, { req }) => v === req.body.password)
    .withMessage('Passwords do not match.'),
];

const login = [
  body('email').trim().isEmail().withMessage('Valid email required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required.'),
];

const changePassword = [
  body('currentPassword').notEmpty().withMessage('Current password required.'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
    .custom((v, { req }) => v !== req.body.currentPassword).withMessage('New password must be different from the current one.'),
  body('confirmPassword').custom((v, { req }) => v === req.body.newPassword).withMessage('Passwords do not match.'),
];

const touristSpot = (isUpdate = false) => {
  const req = (chain) => (isUpdate ? chain.optional() : chain);
  return [
    req(body('name').trim().notEmpty().withMessage('Name required.')),
    req(body('shortDescription').trim().isLength({ min: 1, max: 300 }).withMessage('Short description required (max 300).')),
    req(body('description').trim().notEmpty().withMessage('Description required.')),
    req(body('municipality').trim().notEmpty().withMessage('Municipality required.')),
    req(body('images').isArray({ min: 1 }).withMessage('At least one image URL required.')),
    body('status').optional().isIn(['draft', 'published', 'archived']),
    body('latitude').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -90, max: 90 }),
    body('longitude').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -180, max: 180 }),
    body('estimatedBudget').optional({ nullable: true }).isFloat({ min: 0 }),
    body('categoryIds').optional().isArray(),
    body('openDays').optional().isArray(),
    body('bestMonths').optional().isArray(),
  ];
};

const category = (isUpdate = false) => [
  isUpdate ? body('name').optional().trim().notEmpty() : body('name').trim().notEmpty().withMessage('Name required.'),
  body('displayOrder').optional().isInt(),
  body('isActive').optional().isBoolean(),
];

const review = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5.'),
  body('comment').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment required (max 2000).'),
  body('title').optional().isLength({ max: 120 }),
  body('photos').optional().isArray({ max: 3 }).withMessage('Up to 3 photos.'),
  body('photos.*')
    .optional()
    .isString()
    .matches(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
    .withMessage('Photos must be JPEG, PNG or WebP images.')
    .isLength({ max: 300000 })
    .withMessage('Each photo must be under about 220 KB.'),
];

const itinerary = [
  body('title').trim().notEmpty().withMessage('Title required.'),
  body('days').optional().isArray(),
  body('endDate')
    .optional({ nullable: true, checkFalsy: true })
    .custom((v, { req }) => !req.body.startDate || new Date(v) >= new Date(req.body.startDate))
    .withMessage('End date must be after start date.'),
];

const aiQuery = [
  body('question').trim().isLength({ min: 3, max: 1000 }).withMessage('Question must be 3-1000 characters.'),
  body('budget').optional().isFloat({ min: 0 }),
  body('travelers').optional().isInt({ min: 1, max: 100 }),
  body('durationDays').optional().isInt({ min: 1, max: 50 }),
  body('pace').optional().isIn(['relaxed', 'balanced', 'packed']),
  body('startDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Start date must be a valid date.'),
  // what the Ask page remembers of the chat so far, so "how much is it?" knows what "it" is
  body('ctx').optional({ nullable: true }).custom((v) => typeof v === 'object' && !Array.isArray(v)).withMessage('ctx must be an object.'),
  body('ctx.q').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body('ctx.ids').optional({ nullable: true }).isArray({ max: 8 }),
  body('ctx.ids.*').optional().isString().isLength({ max: 64 }),
  body('ctx.days').optional({ nullable: true }).isInt({ min: 1, max: 50 }),
];

// Leyte Passport
const passportStamp = [
  body('method').optional().isIn(METHODS).withMessage('Method must be gps or manual.'),
  body('at').optional().isISO8601().withMessage('Date must be an ISO date.'),
];
const passportMerge = [
  body('stamps').isArray({ max: MAX_STAMPS }).withMessage(`Send a list of up to ${MAX_STAMPS} stamps.`),
  body('stamps.*.spot').isMongoId().withMessage('Each stamp needs a valid spot id.'),
  body('stamps.*.at').optional().isISO8601().withMessage('Date must be an ISO date.'),
  body('stamps.*.method').optional().isIn(METHODS).withMessage('Method must be gps or manual.'),
];
const passportProfile = [
  body('homeTown').optional().isString().trim().isLength({ max: 60 }).withMessage('Home town can be up to 60 characters.'),
  body('color').optional().isIn(PASSPORT_COLORS).withMessage(`Colour must be one of: ${PASSPORT_COLORS.join(', ')}.`),
];

module.exports = { register, login, changePassword, touristSpot, category, review, itinerary, aiQuery, passportStamp, passportMerge, passportProfile };
