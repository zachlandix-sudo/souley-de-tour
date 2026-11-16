const TouristSpot = require('../models/TouristSpot');
const Review = require('../models/Review');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const paginate = require('../utils/pagination');
const escapeRegex = require('../utils/escapeRegex');
const { toCsv } = require('../utils/csv');
const { record, nameList } = require('../utils/audit');
const { analyzeSpots, CHECK_KEYS } = require('../services/contentHealthService');
const { recalcSpotRating } = require('./reviewController');

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const OID = /^[a-f\d]{24}$/i;
const MAX_BULK = 100;
const MAX_EXPORT = 5000;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// A query value that must be one plain string (?q[$ne]=x or ?q=a&q=b would otherwise reach the database as an object / array).
const str = (v, name) => {
  if (v === undefined || v === '') return undefined;
  if (typeof v !== 'string') throw new AppError(`${name} must be a single value.`, 400);
  return v.trim().slice(0, 80);
};

// ids from a request body: 1..100 distinct valid ObjectIds
function readIds(body) {
  const raw = body && body.ids;
  if (!Array.isArray(raw) || raw.length === 0) throw new AppError('Pick at least one item.', 422);
  if (raw.length > MAX_BULK) throw new AppError(`Pick at most ${MAX_BULK} items at a time.`, 422);
  if (!raw.every((id) => typeof id === 'string' && OID.test(id))) throw new AppError('One of the ids is not valid.', 422);
  return [...new Set(raw)];
}

// ---------------------------------------------------------------- bulk actions on spots
// single = the activity-line name when exactly one spot was touched, bulk = when several were
const SPOT_ACTIONS = {
  publish: { set: { status: 'published' }, single: 'spot.published', bulk: 'spot.bulk_published' },
  draft: { set: { status: 'draft' }, single: 'spot.draft', bulk: 'spot.bulk_draft' },
  archive: { set: { status: 'archived' }, single: 'spot.archived', bulk: 'spot.bulk_archived' },
  feature: { set: { isFeatured: true }, single: 'spot.featured', bulk: 'spot.bulk_featured' },
  unfeature: { set: { isFeatured: false }, single: 'spot.unfeatured', bulk: 'spot.bulk_unfeatured' },
  delete: { single: 'spot.deleted', bulk: 'spot.bulk_deleted' },
};

// POST /api/admin/spots/bulk   { ids: [...], action: publish | draft | archive | feature | unfeature | delete }
exports.bulkSpots = asyncHandler(async (req, res) => {
  const action = req.body && req.body.action;
  if (typeof action !== 'string' || !has(SPOT_ACTIONS, action)) throw new AppError(`action must be one of: ${Object.keys(SPOT_ACTIONS).join(', ')}.`, 422);
  if (action === 'delete' && req.user.role !== 'admin') throw new AppError('Only an admin can delete spots.', 403);
  const ids = readIds(req.body);
  const def = SPOT_ACTIONS[action];

  const spots = await TouristSpot.find({ _id: { $in: ids } }).select('name').lean();
  if (!spots.length) throw new AppError('Those spots no longer exist.', 404);
  const found = spots.map((s) => s._id);

  if (action === 'delete') {
    await Review.deleteMany({ touristSpotId: { $in: found } });
    await TouristSpot.deleteMany({ _id: { $in: found } });
  } else {
    await TouristSpot.updateMany({ _id: { $in: found } }, { $set: def.set });
  }

  const one = spots.length === 1;
  await record(req, {
    action: one ? def.single : def.bulk,
    targetType: 'spot',
    targetId: one ? spots[0]._id : undefined,
    targetLabel: nameList(spots.map((s) => s.name)),
    detail: one ? undefined : plural(spots.length, 'spot'),
  });
  res.json({ success: true, data: { action, requested: ids.length, matched: spots.length } });
});

// ---------------------------------------------------------------- bulk actions on reviews (admin)
const REVIEW_ACTIONS = {
  approve: { status: 'approved', bulk: 'review.bulk_approved' },
  reject: { status: 'rejected', bulk: 'review.bulk_rejected' },
  pending: { status: 'pending', bulk: 'review.bulk_pending' },
  delete: { bulk: 'review.bulk_deleted' },
};

// POST /api/admin/reviews/bulk   { ids: [...], action: approve | reject | pending | delete }
exports.bulkReviews = asyncHandler(async (req, res) => {
  const action = req.body && req.body.action;
  if (typeof action !== 'string' || !has(REVIEW_ACTIONS, action)) throw new AppError(`action must be one of: ${Object.keys(REVIEW_ACTIONS).join(', ')}.`, 422);
  const ids = readIds(req.body);
  const def = REVIEW_ACTIONS[action];

  const reviews = await Review.find({ _id: { $in: ids } }).select('touristSpotId').lean();
  if (!reviews.length) throw new AppError('Those reviews no longer exist.', 404);
  const found = reviews.map((r) => r._id);

  if (action === 'delete') await Review.deleteMany({ _id: { $in: found } });
  else await Review.updateMany({ _id: { $in: found } }, { $set: { status: def.status } });

  // star averages come from approved reviews only, so every spot touched is recounted
  const spotIds = [...new Set(reviews.map((r) => String(r.touristSpotId)))];
  await Promise.all(spotIds.map((id) => recalcSpotRating(id)));

  await record(req, { action: def.bulk, targetType: 'review', targetLabel: plural(reviews.length, 'review'), detail: `on ${plural(spotIds.length, 'spot')}` });
  res.json({ success: true, data: { action, requested: ids.length, matched: reviews.length } });
});

// ---------------------------------------------------------------- activity log (admin)
const TARGET_TYPES = ['spot', 'user', 'review', 'category', 'export', 'system'];

// GET /api/admin/activity?type=spot|user|review|category|export&q=text&page=1&limit=20
exports.activity = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, 100);
  const type = str(req.query.type, 'type');
  const q = str(req.query.q, 'q');
  const filter = {};
  if (type) {
    if (!TARGET_TYPES.includes(type)) throw new AppError(`type must be one of: ${TARGET_TYPES.join(', ')}.`, 400);
    filter.targetType = type;
  }
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ actorName: rx }, { targetLabel: rx }, { detail: rx }];
  }
  const [data, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// ---------------------------------------------------------------- content health
const HEALTH_FIELDS = 'name slug municipality status description categoryIds location images contactPhone contactEmail estimatedBudget recommendedDuration bestTimeToVisit updatedAt';

// GET /api/admin/health            -> score + every check with its first 8 spots
// GET /api/admin/health?check=noPin&limit=500   -> one check with a longer list
exports.health = asyncHandler(async (req, res) => {
  const check = str(req.query.check, 'check');
  if (check && !CHECK_KEYS.includes(check)) throw new AppError(`check must be one of: ${CHECK_KEYS.join(', ')}.`, 400);
  const asked = parseInt(req.query.limit, 10);
  const limit = Math.min(Math.max(Number.isFinite(asked) ? asked : 8, 1), 500);
  const spots = await TouristSpot.find({}).select(HEALTH_FIELDS).lean();
  res.json({ success: true, data: { ...analyzeSpots(spots, { limit, only: check }), generatedAt: new Date().toISOString() } });
});

// ---------------------------------------------------------------- CSV export
const latLng = (s, i) => { const c = s.location && s.location.coordinates; return Array.isArray(c) && c.length === 2 ? c[i] : ''; };
const nameOf = (v) => (v && typeof v === 'object' ? v.name : '');

const EXPORTS = {
  spots: {
    roles: ['admin', 'editor'],
    async load(q) {
      const status = str(q.status, 'status');
      const search = str(q.search, 'search');
      const filter = {};
      if (status && status !== 'all') {
        if (!['draft', 'published', 'archived'].includes(status)) throw new AppError('status must be draft, published, archived or all.', 400);
        filter.status = status;
      }
      if (search) { const rx = new RegExp(escapeRegex(search), 'i'); filter.$or = [{ name: rx }, { municipality: rx }, { barangay: rx }]; }
      return TouristSpot.find(filter).populate('categoryIds', 'name').sort({ name: 1 }).limit(MAX_EXPORT).lean();
    },
    columns: [
      { header: 'Name', value: (s) => s.name }, { header: 'Slug', value: (s) => s.slug }, { header: 'Status', value: (s) => s.status },
      { header: 'Featured', value: (s) => !!s.isFeatured }, { header: 'Municipality', value: (s) => s.municipality }, { header: 'Barangay', value: (s) => s.barangay },
      { header: 'Address', value: (s) => s.address }, { header: 'Latitude', value: (s) => latLng(s, 1) }, { header: 'Longitude', value: (s) => latLng(s, 0) },
      { header: 'Categories', value: (s) => (s.categoryIds || []).map(nameOf) }, { header: 'Entrance fee', value: (s) => s.entranceFee },
      { header: 'Estimated budget (PHP)', value: (s) => s.estimatedBudget }, { header: 'Difficulty', value: (s) => s.difficulty },
      { header: 'Views', value: (s) => s.viewCount }, { header: 'Favorites', value: (s) => s.favoriteCount },
      { header: 'Average rating', value: (s) => s.averageRating }, { header: 'Reviews', value: (s) => s.reviewCount },
      { header: 'Updated', value: (s) => s.updatedAt }, { header: 'Created', value: (s) => s.createdAt },
    ],
  },
  users: {
    roles: ['admin'],
    async load(q) {
      const role = str(q.role, 'role');
      const status = str(q.status, 'status');
      const search = str(q.search, 'search');
      const filter = {};
      if (role) filter.role = role;
      if (status) filter.status = status;
      if (search) { const rx = new RegExp(escapeRegex(search), 'i'); filter.$or = [{ fullName: rx }, { email: rx }]; }
      return User.find(filter).sort({ createdAt: -1 }).limit(MAX_EXPORT).lean();
    },
    columns: [
      { header: 'Name', value: (u) => u.fullName }, { header: 'Email', value: (u) => u.email }, { header: 'Role', value: (u) => u.role },
      { header: 'Status', value: (u) => u.status }, { header: 'Joined', value: (u) => u.createdAt }, { header: 'Last login', value: (u) => u.lastLogin },
      { header: 'Favorites', value: (u) => (u.favoriteTouristSpots || []).length },
    ],
  },
  reviews: {
    roles: ['admin'],
    async load(q) {
      const status = str(q.status, 'status');
      const filter = {};
      if (status) {
        if (!['pending', 'approved', 'rejected'].includes(status)) throw new AppError('status must be pending, approved or rejected.', 400);
        filter.status = status;
      }
      return Review.find(filter).populate('userId', 'fullName email').populate('touristSpotId', 'name').sort({ createdAt: -1 }).limit(MAX_EXPORT).lean();
    },
    columns: [
      { header: 'Spot', value: (r) => nameOf(r.touristSpotId) }, { header: 'Reviewer', value: (r) => r.userId && r.userId.fullName },
      { header: 'Email', value: (r) => r.userId && r.userId.email }, { header: 'Rating', value: (r) => r.rating }, { header: 'Title', value: (r) => r.title },
      { header: 'Comment', value: (r) => r.comment }, { header: 'Status', value: (r) => r.status }, { header: 'Visit date', value: (r) => r.visitDate }, { header: 'Submitted', value: (r) => r.createdAt },
    ],
  },
  activity: {
    roles: ['admin'],
    async load(q) {
      const type = str(q.type, 'type');
      const text = str(q.q, 'q');
      const filter = {};
      if (type) {
        if (!TARGET_TYPES.includes(type)) throw new AppError(`type must be one of: ${TARGET_TYPES.join(', ')}.`, 400);
        filter.targetType = type;
      }
      if (text) { const rx = new RegExp(escapeRegex(text), 'i'); filter.$or = [{ actorName: rx }, { targetLabel: rx }, { detail: rx }]; }
      return AuditLog.find(filter).sort({ createdAt: -1, _id: -1 }).limit(MAX_EXPORT).lean();
    },
    columns: [
      { header: 'When', value: (a) => a.createdAt }, { header: 'Who', value: (a) => a.actorName }, { header: 'Role', value: (a) => a.actorRole },
      { header: 'Action', value: (a) => a.action }, { header: 'Target', value: (a) => a.targetLabel }, { header: 'Detail', value: (a) => a.detail },
    ],
  },
};

// GET /api/admin/export/:kind   kind = spots | users | reviews | activity   (the list's own filters work here too)
exports.exportCsv = asyncHandler(async (req, res) => {
  const { kind } = req.params;
  if (!has(EXPORTS, kind)) throw new AppError('Unknown export.', 404);
  const def = EXPORTS[kind];
  if (!def.roles.includes(req.user.role)) throw new AppError('You do not have permission to do this.', 403);

  const rows = await def.load(req.query);
  const csv = toCsv(def.columns, rows);
  await record(req, { action: `export.${kind}`, targetType: 'export', targetLabel: `${kind} list`, detail: plural(rows.length, 'row') });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="souley-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(csv);
});

exports.MAX_BULK = MAX_BULK;
