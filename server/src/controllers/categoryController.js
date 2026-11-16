const Category = require('../models/Category');
const TouristSpot = require('../models/TouristSpot');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');
const escapeRegex = require('../utils/escapeRegex');
const { record } = require('../utils/audit');

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  const isAdmin = req.user && req.user.role === 'admin';
  if (!isAdmin) filter.isActive = true;
  else if (req.query.active === 'true') filter.isActive = true;
  else if (req.query.active === 'false') filter.isActive = false;
  if (req.query.search) filter.name = new RegExp(escapeRegex(req.query.search), 'i');
  const data = await Category.find(filter).sort({ displayOrder: 1, name: 1 });
  res.json({ success: true, data });
});

exports.create = asyncHandler(async (req, res) => {
  const cat = await Category.create({ ...req.body, slug: slugify(req.body.slug || req.body.name) });
  await record(req, { action: 'category.created', targetType: 'category', targetId: cat._id, targetLabel: cat.name });
  res.status(201).json({ success: true, data: cat });
});

exports.update = asyncHandler(async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) throw new AppError('Category not found.', 404);
  const data = { ...req.body };
  if (data.name && !data.slug) data.slug = slugify(data.name);
  if (data.slug) data.slug = slugify(data.slug);
  cat.set(data);
  await cat.save();
  await record(req, { action: 'category.updated', targetType: 'category', targetId: cat._id, targetLabel: cat.name });
  res.json({ success: true, data: cat });
});

exports.remove = asyncHandler(async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) throw new AppError('Category not found.', 404);
  const used = await TouristSpot.countDocuments({ categoryIds: cat._id });
  if (used > 0) {
    throw new AppError(`Category still used by ${used} tourist spot(s). Reassign them first.`, 409);
  }
  await cat.deleteOne();
  await record(req, { action: 'category.deleted', targetType: 'category', targetId: cat._id, targetLabel: cat.name });
  res.json({ success: true, message: 'Category deleted.' });
});
