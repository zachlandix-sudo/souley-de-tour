const mongoose = require('mongoose');
const Review = require('../models/Review');
const TouristSpot = require('../models/TouristSpot');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const paginate = require('../utils/pagination');
const { record } = require('../utils/audit');

// recalc average from APPROVED reviews only
const recalc = async (spotId) => {
  const [agg] = await Review.aggregate([
    { $match: { touristSpotId: new mongoose.Types.ObjectId(spotId), status: 'approved' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await TouristSpot.updateOne(
    { _id: spotId },
    { averageRating: agg ? Math.round(agg.avg * 10) / 10 : 0, reviewCount: agg ? agg.count : 0 }
  );
};

// "4★ review on Kawasan Falls" for the activity log
// (a failed lookup only shortens the label: the moderation itself must never fail because of the log)
const labelFor = async (review) => {
  try {
    const spot = await TouristSpot.findById(review.touristSpotId).select('name').lean();
    return `${review.rating}★ review on ${spot ? spot.name : 'a removed spot'}`;
  } catch {
    return `${review.rating}★ review`;
  }
};

// GET /api/tourist-spots/:id/reviews  (approved only)
exports.listForSpot = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, 50);
  const filter = { touristSpotId: req.params.id, status: 'approved' };
  const [data, total] = await Promise.all([
    Review.find(filter).populate('userId', 'fullName').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(filter),
  ]);
  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// POST /api/tourist-spots/:id/reviews
exports.create = asyncHandler(async (req, res) => {
  const spot = await TouristSpot.findOne({ _id: req.params.id, status: 'published' });
  if (!spot) throw new AppError('Tourist spot not found.', 404);
  if (await Review.exists({ touristSpotId: spot._id, userId: req.user._id })) {
    throw new AppError('You already reviewed this tourist spot.', 409);
  }
  const { rating, title, comment, visitDate, photos } = req.body;
  // staff reviews skip moderation, visitors go pending
  const status = ['admin', 'editor'].includes(req.user.role) ? 'approved' : 'pending';
  const review = await Review.create({ touristSpotId: spot._id, userId: req.user._id, rating, title, comment, visitDate, photos, status });
  if (status === 'approved') await recalc(spot._id);
  res.status(201).json({ success: true, data: review, message: status === 'pending' ? 'Review submitted for approval.' : undefined });
});

// PUT /api/reviews/:id  (owner or admin)
exports.update = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found.', 404);
  const isOwner = String(review.userId) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw new AppError('Not allowed.', 403);
  const { rating, title, comment, visitDate, photos } = req.body;
  review.set({ rating, title, comment, visitDate, photos });
  if (isOwner && req.user.role === 'visitor') review.status = 'pending'; // re-moderate after edit
  await review.save();
  await recalc(review.touristSpotId);
  res.json({ success: true, data: review });
});

// DELETE /api/reviews/:id
exports.remove = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found.', 404);
  const isOwner = String(review.userId) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw new AppError('Not allowed.', 403);
  const label = isOwner ? null : await labelFor(review);
  await review.deleteOne();
  await recalc(review.touristSpotId);
  if (!isOwner) await record(req, { action: 'review.deleted', targetType: 'review', targetId: review._id, targetLabel: label });
  res.json({ success: true, message: 'Review deleted.' });
});

// PATCH /api/reviews/:id/status (admin)
exports.setStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) throw new AppError('Invalid status.', 422);
  const review = await Review.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!review) throw new AppError('Review not found.', 404);
  await recalc(review.touristSpotId);
  await record(req, { action: `review.${status}`, targetType: 'review', targetId: review._id, targetLabel: await labelFor(review) });
  res.json({ success: true, data: review });
});

// GET /api/reviews  (admin moderation list)   ?status=pending|approved|rejected  ?rating=1..5
// `counts` always covers all three tabs (whatever the filters), so the tabs can show how many are waiting.
exports.listAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, 100);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const rating = Number(req.query.rating);
  if (Number.isInteger(rating) && rating >= 1 && rating <= 5) filter.rating = rating;
  const [data, total, grouped] = await Promise.all([
    Review.find(filter).populate('userId', 'fullName email').populate('touristSpotId', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(filter),
    Review.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const counts = { pending: 0, approved: 0, rejected: 0 };
  (grouped || []).forEach((g) => { if (Object.prototype.hasOwnProperty.call(counts, g._id)) counts[g._id] = g.n; });
  res.json({ success: true, data, counts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// used by the bulk review actions in adminController
exports.recalcSpotRating = recalc;
