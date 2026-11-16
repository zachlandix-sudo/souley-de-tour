const TouristSpot = require('../models/TouristSpot');
const Category = require('../models/Category');
const Review = require('../models/Review');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');
const paginate = require('../utils/pagination');
const escapeRegex = require('../utils/escapeRegex');
const { record } = require('../utils/audit');

const isStaff = (u) => u && ['admin', 'editor'].includes(u.role);

// turn latitude/longitude from form into GeoJSON
const withLocation = (data) => {
  const out = { ...data };
  const { latitude, longitude } = out;
  if (latitude !== undefined && longitude !== undefined && latitude !== '' && longitude !== '') {
    out.location = { type: 'Point', coordinates: [Number(longitude), Number(latitude)] };
  }
  delete out.latitude;
  delete out.longitude;
  return out;
};

const uniqueSlug = async (base, ignoreId) => {
  let slug = slugify(base) || 'spot';
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await TouristSpot.exists({ slug, ...(ignoreId && { _id: { $ne: ignoreId } }) })) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
};

const SORTS = {
  newest: { createdAt: -1 },
  popularity: { viewCount: -1 },
  rating: { averageRating: -1, reviewCount: -1 },
  name: { name: 1 },
};

// GET /api/tourist-spots
exports.list = asyncHandler(async (req, res) => {
  const { search, municipality, category, status, difficulty, featured, minRating, maxBudget, activity, sort } = req.query;
  const { page, limit, skip } = paginate(req.query);
  const filter = {};

  // public only sees published. staff may filter by status (or 'all').
  if (isStaff(req.user)) {
    if (status && status !== 'all') filter.status = status;
  } else {
    filter.status = 'published';
  }

  if (municipality) filter.municipality = new RegExp(`^${escapeRegex(municipality)}$`, 'i');
  if (difficulty) filter.difficulty = difficulty;
  if (featured === 'true') filter.isFeatured = true;
  if (minRating) filter.averageRating = { $gte: Number(minRating) };
  if (maxBudget) filter.estimatedBudget = { $lte: Number(maxBudget) };
  if (activity) filter.activities = new RegExp(escapeRegex(activity), 'i');

  if (category) {
    const cat = await Category.findOne({ $or: [{ slug: category }, ...(category.match(/^[a-f\d]{24}$/i) ? [{ _id: category }] : [])] });
    filter.categoryIds = cat ? cat._id : null; // unknown category => empty result
  }

  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { shortDescription: rx }, { municipality: rx }, { barangay: rx }, { activities: rx }];
  }

  const sortBy = SORTS[sort] || SORTS.newest;
  const [items, total] = await Promise.all([
    TouristSpot.find(filter).populate('categoryIds', 'name slug icon').sort(sortBy).skip(skip).limit(limit).lean(),
    TouristSpot.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// GET /api/tourist-spots/:id   (id or slug)
exports.getOne = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const byId = /^[a-f\d]{24}$/i.test(id);
  const spot = await TouristSpot.findOne(byId ? { _id: id } : { slug: id })
    .populate('categoryIds', 'name slug icon')
    .populate('nearbySpotIds', 'name slug images municipality shortDescription');
  if (!spot) throw new AppError('Tourist spot not found.', 404);
  if (spot.status !== 'published' && !isStaff(req.user)) throw new AppError('Tourist spot not found.', 404);

  if (spot.status === 'published') {
    spot.viewCount += 1;
    await spot.save();
  }
  res.json({ success: true, data: spot });
});

// POST /api/tourist-spots
exports.create = asyncHandler(async (req, res) => {
  const data = withLocation(req.body);
  delete data.averageRating;
  delete data.reviewCount;
  delete data.viewCount;
  delete data.favoriteCount;
  data.slug = await uniqueSlug(data.slug || data.name);
  data.createdBy = req.user._id;
  const spot = await TouristSpot.create(data);
  await record(req, { action: 'spot.created', targetType: 'spot', targetId: spot._id, targetLabel: spot.name, detail: `Saved as ${spot.status}` });
  res.status(201).json({ success: true, data: spot });
});

// PUT /api/tourist-spots/:id
exports.update = asyncHandler(async (req, res) => {
  const spot = await TouristSpot.findById(req.params.id);
  if (!spot) throw new AppError('Tourist spot not found.', 404);
  const data = withLocation(req.body);
  ['averageRating', 'reviewCount', 'viewCount', 'favoriteCount', 'createdBy', '_id'].forEach((k) => delete data[k]);
  if (data.slug || (data.name && data.name !== spot.name && !data.slug)) {
    data.slug = await uniqueSlug(data.slug || data.name, spot._id);
  }
  spot.set(data);
  await spot.save();
  await record(req, { action: 'spot.updated', targetType: 'spot', targetId: spot._id, targetLabel: spot.name });
  res.json({ success: true, data: spot });
});

// PATCH /api/tourist-spots/:id/status
exports.setStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['draft', 'published', 'archived'].includes(status)) throw new AppError('Invalid status.', 422);
  const spot = await TouristSpot.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!spot) throw new AppError('Tourist spot not found.', 404);
  await record(req, { action: `spot.${status}`, targetType: 'spot', targetId: spot._id, targetLabel: spot.name });
  res.json({ success: true, data: spot });
});

// DELETE /api/tourist-spots/:id  (admin)  ?hard=true to really delete, else archive
exports.remove = asyncHandler(async (req, res) => {
  const spot = await TouristSpot.findById(req.params.id);
  if (!spot) throw new AppError('Tourist spot not found.', 404);
  if (req.query.hard === 'true') {
    await Review.deleteMany({ touristSpotId: spot._id });
    await spot.deleteOne();
    await record(req, { action: 'spot.deleted', targetType: 'spot', targetId: spot._id, targetLabel: spot.name });
    return res.json({ success: true, message: 'Tourist spot deleted permanently.' });
  }
  spot.status = 'archived';
  await spot.save();
  await record(req, { action: 'spot.archived', targetType: 'spot', targetId: spot._id, targetLabel: spot.name });
  res.json({ success: true, message: 'Tourist spot archived.', data: spot });
});
