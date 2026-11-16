const Itinerary = require('../models/Itinerary');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const mine = async (req) => {
  const it = await Itinerary.findOne({ _id: req.params.id, userId: req.user._id });
  if (!it) throw new AppError('Itinerary not found.', 404);
  return it;
};

const clean = (body) => {
  const { title, startDate, endDate, days, notes } = body;
  const out = { title, startDate, endDate, notes };
  if (Array.isArray(days)) {
    out.days = days.map((d, i) => ({
      dayNumber: d.dayNumber || i + 1,
      items: (d.items || []).map((it, j) => ({
        touristSpotId: it.touristSpotId,
        visitOrder: it.visitOrder || j + 1,
        notes: it.notes,
        estimatedBudget: it.estimatedBudget,
      })),
    }));
  }
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
};

exports.list = asyncHandler(async (req, res) => {
  const data = await Itinerary.find({ userId: req.user._id }).sort({ updatedAt: -1 });
  res.json({ success: true, data });
});

exports.create = asyncHandler(async (req, res) => {
  const it = await Itinerary.create({ ...clean(req.body), userId: req.user._id });
  res.status(201).json({ success: true, data: it });
});

exports.getOne = asyncHandler(async (req, res) => {
  const it = await Itinerary.findOne({ _id: req.params.id, userId: req.user._id }).populate(
    'days.items.touristSpotId',
    'name slug images municipality shortDescription estimatedBudget location'
  );
  if (!it) throw new AppError('Itinerary not found.', 404);
  res.json({ success: true, data: it });
});

exports.update = asyncHandler(async (req, res) => {
  const it = await mine(req);
  it.set(clean(req.body));
  await it.save();
  res.json({ success: true, data: it });
});

exports.remove = asyncHandler(async (req, res) => {
  const it = await mine(req);
  await it.deleteOne();
  res.json({ success: true, message: 'Itinerary deleted.' });
});
