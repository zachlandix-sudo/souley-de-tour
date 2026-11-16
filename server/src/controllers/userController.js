const User = require('../models/User');
const TouristSpot = require('../models/TouristSpot');
const Review = require('../models/Review');
const Itinerary = require('../models/Itinerary');
const AiConversation = require('../models/AiConversation');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const paginate = require('../utils/pagination');
const escapeRegex = require('../utils/escapeRegex');
const { record } = require('../utils/audit');

const isLocked = (u) => !!(u.lockUntil && new Date(u.lockUntil).getTime() > Date.now());

// ---- favorites (self) ----
exports.getFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'favoriteTouristSpots',
    match: { status: 'published' },
    populate: { path: 'categoryIds', select: 'name slug' },
  });
  res.json({ success: true, data: user.favoriteTouristSpots });
});

exports.addFavorite = asyncHandler(async (req, res) => {
  const spot = await TouristSpot.findOne({ _id: req.params.touristSpotId, status: 'published' });
  if (!spot) throw new AppError('Tourist spot not found.', 404);
  const r = await User.updateOne({ _id: req.user._id }, { $addToSet: { favoriteTouristSpots: spot._id } });
  if (r.modifiedCount) await TouristSpot.updateOne({ _id: spot._id }, { $inc: { favoriteCount: 1 } });
  res.status(201).json({ success: true, message: 'Added to favorites.' });
});

exports.removeFavorite = asyncHandler(async (req, res) => {
  const r = await User.updateOne({ _id: req.user._id }, { $pull: { favoriteTouristSpots: req.params.touristSpotId } });
  if (r.modifiedCount) {
    await TouristSpot.updateOne({ _id: req.params.touristSpotId, favoriteCount: { $gt: 0 } }, { $inc: { favoriteCount: -1 } });
  }
  res.json({ success: true, message: 'Removed from favorites.' });
});

// ---- my journey (self): the signed-in visitor's own activity, for the /journey page ----
// Only ever reads rows that belong to req.user. Nothing here is shared with other people.
exports.myOverview = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const [favorites, reviews, pendingReviews, trips, asks, reviewedSpots, recentReviews, recentTrips, recentAsks] = await Promise.all([
    User.findById(me).select('favoriteTouristSpots createdAt').lean(),
    Review.countDocuments({ userId: me }),
    Review.countDocuments({ userId: me, status: 'pending' }),
    Itinerary.countDocuments({ userId: me }),
    AiConversation.countDocuments({ userId: me }),
    Review.distinct('touristSpotId', { userId: me }), // every spot this person reviewed (one review per spot), so the page can nudge about the rest
    Review.find({ userId: me }).sort({ createdAt: -1 }).limit(6).select('rating title status createdAt touristSpotId').populate('touristSpotId', 'name slug municipality').lean(),
    Itinerary.find({ userId: me }).sort({ updatedAt: -1 }).limit(4).select('title generatedByAI startDate endDate updatedAt days').lean(),
    AiConversation.find({ userId: me }).sort({ updatedAt: -1 }).limit(5).select('messages updatedAt').lean(),
  ]);
  res.json({
    success: true,
    data: {
      memberSince: favorites?.createdAt || null,
      counts: { favorites: (favorites?.favoriteTouristSpots || []).length, reviews, pendingReviews, trips, asks },
      reviewedSpotIds: (reviewedSpots || []).map(String),
      reviews: recentReviews.map((r) => ({
        _id: r._id,
        rating: r.rating,
        title: r.title || '',
        status: r.status,
        createdAt: r.createdAt,
        spot: r.touristSpotId ? { _id: r.touristSpotId._id, name: r.touristSpotId.name, slug: r.touristSpotId.slug, municipality: r.touristSpotId.municipality } : null,
      })),
      trips: recentTrips.map((t) => ({
        _id: t._id,
        title: t.title,
        generatedByAI: !!t.generatedByAI,
        startDate: t.startDate || null,
        endDate: t.endDate || null,
        updatedAt: t.updatedAt,
        days: (t.days || []).length,
        stops: (t.days || []).reduce((n, d) => n + (d.items || []).length, 0),
      })),
      // only what the visitor typed (the first user message of each chat), never the model's answer
      asks: recentAsks
        .map((c) => ({ _id: c._id, question: ((c.messages || []).find((m) => m.role === 'user') || {}).content || '', at: c.updatedAt }))
        .filter((a) => a.question)
        .map((a) => ({ ...a, question: a.question.slice(0, 200) })),
    },
  });
});

// ---- admin user management ----
exports.list = asyncHandler(async (req, res) => {
  const { search, role, status } = req.query;
  const { page, limit, skip } = paginate(req.query, 100);
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ fullName: rx }, { email: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  // `locked` = too many wrong passwords, waiting out the 15 minute lock (the lock date itself never leaves the server)
  const data = users.map((u) => ({ ...u.toJSON(), locked: isLocked(u) }));
  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  res.json({ success: true, data: user });
});

exports.update = asyncHandler(async (req, res) => {
  const { role, status } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  if (String(user._id) === String(req.user._id)) throw new AppError('You cannot change your own role or status.', 400);
  const was = { role: user.role, status: user.status };
  if (role) {
    if (!['visitor', 'editor', 'admin'].includes(role)) throw new AppError('Invalid role.', 422);
    user.role = role;
  }
  if (status) {
    if (!['active', 'suspended'].includes(status)) throw new AppError('Invalid status.', 422);
    user.status = status;
  }
  await user.save();
  if (role && role !== was.role) await record(req, { action: 'user.role_changed', targetType: 'user', targetId: user._id, targetLabel: user.fullName, detail: `${was.role} → ${user.role}` });
  if (status && status !== was.status) await record(req, { action: status === 'suspended' ? 'user.suspended' : 'user.activated', targetType: 'user', targetId: user._id, targetLabel: user.fullName });
  res.json({ success: true, data: user });
});

exports.remove = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  if (String(user._id) === String(req.user._id)) throw new AppError('You cannot delete yourself.', 400);
  if (user.role === 'admin') throw new AppError('Demote admin before deleting.', 400);
  await Promise.all([Review.deleteMany({ userId: user._id }), Itinerary.deleteMany({ userId: user._id })]);
  await user.deleteOne();
  await record(req, { action: 'user.deleted', targetType: 'user', targetId: user._id, targetLabel: user.fullName, detail: user.email });
  res.json({ success: true, message: 'User deleted.' });
});

// GET /api/users/:id/overview  (admin) what this person has done on the site, for the details panel
exports.overview = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  const [reviews, approvedReviews, itineraries, recentReviews, recentTrips] = await Promise.all([
    Review.countDocuments({ userId: user._id }),
    Review.countDocuments({ userId: user._id, status: 'approved' }),
    Itinerary.countDocuments({ userId: user._id }),
    Review.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).select('rating title status createdAt touristSpotId').populate('touristSpotId', 'name slug').lean(),
    Itinerary.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).select('title generatedByAI createdAt days').lean(),
  ]);
  res.json({
    success: true,
    data: {
      user: { ...user.toJSON(), locked: isLocked(user) },
      counts: { reviews, approvedReviews, itineraries, favorites: (user.favoriteTouristSpots || []).length },
      recentReviews,
      recentTrips: recentTrips.map((t) => ({ _id: t._id, title: t.title, generatedByAI: !!t.generatedByAI, createdAt: t.createdAt, days: (t.days || []).length })),
    },
  });
});

// POST /api/users/:id/force-logout  (admin) every device of this person is signed out; they can log in again
exports.forceLogout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  if (String(user._id) === String(req.user._id)) throw new AppError('Use "Log out everywhere" on your own account page.', 400);
  await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
  await record(req, { action: 'user.signed_out', targetType: 'user', targetId: user._id, targetLabel: user.fullName, detail: 'on every device' });
  res.json({ success: true, message: `${user.fullName} was signed out on every device.` });
});

// POST /api/users/:id/unlock  (admin) lets someone in right away after too many wrong passwords
exports.unlock = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  await User.updateOne({ _id: user._id }, { $set: { failedLoginCount: 0 }, $unset: { lockUntil: 1 } });
  await record(req, { action: 'user.unlocked', targetType: 'user', targetId: user._id, targetLabel: user.fullName });
  res.json({ success: true, message: `${user.fullName} can try to log in again.` });
});
