const User = require('../models/User');
const TouristSpot = require('../models/TouristSpot');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { MAX_STAMPS, mergeStamps, safeDate, toClientStamps } = require('../utils/passport');

const SPOT_FIELDS = 'name slug municipality';

// The signed-in visitor's stamps, with the spot details filled in.
async function readStamps(userId) {
  const u = await User.findById(userId).select('+stamps').populate({ path: 'stamps.spot', select: SPOT_FIELDS });
  return toClientStamps(u ? u.stamps : []);
}

exports.getStamps = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { stamps: await readStamps(req.user._id) } });
});

// Bulk merge: used once after login to move the stamps collected as a guest into the account. Safe to repeat.
exports.mergeStamps = asyncHandler(async (req, res) => {
  const incoming = req.body.stamps;
  const ids = [...new Set(incoming.map((s) => String(s.spot)))];
  const valid = await TouristSpot.find({ _id: { $in: ids }, status: 'published' }).select('_id');
  const current = await User.findById(req.user._id).select('+stamps');
  const before = current ? current.stamps : [];
  const { stamps, added } = mergeStamps(before, incoming, new Set(valid.map((s) => String(s._id))));
  // write only when something changed (a new stamp, or an earlier visit date replacing a later one)
  const changed = added > 0 || stamps.some((s, i) => before[i] && new Date(s.at).getTime() !== new Date(before[i].at).getTime());
  if (changed) await User.updateOne({ _id: req.user._id }, { $set: { stamps } });
  res.json({ success: true, data: { stamps: await readStamps(req.user._id), added } });
});

exports.addStamp = asyncHandler(async (req, res) => {
  const spot = await TouristSpot.findOne({ _id: req.params.touristSpotId, status: 'published' }).select('_id');
  if (!spot) throw new AppError('Tourist spot not found.', 404);
  const at = safeDate(req.body.at);
  const method = req.body.method === 'manual' ? 'manual' : 'gps';
  // one stamp per spot, and never more than MAX_STAMPS, both checked in the same atomic update
  const r = await User.updateOne(
    { _id: req.user._id, 'stamps.spot': { $ne: spot._id }, [`stamps.${MAX_STAMPS - 1}`]: { $exists: false } },
    { $push: { stamps: { spot: spot._id, at, method } } }
  );
  if (r.modifiedCount) return res.status(201).json({ success: true, message: 'Stamp added.', data: { created: true } });
  if (await User.exists({ _id: req.user._id, 'stamps.spot': spot._id })) {
    return res.json({ success: true, message: 'Already stamped.', data: { created: false } });
  }
  throw new AppError('Your passport is full.', 409);
});

exports.removeStamp = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $pull: { stamps: { spot: req.params.touristSpotId } } });
  res.json({ success: true, message: 'Stamp removed.' });
});

// Home town and cover colour. Only the fields that were sent change.
exports.updateProfile = asyncHandler(async (req, res) => {
  const set = {};
  if (req.body.homeTown !== undefined) set['passport.homeTown'] = String(req.body.homeTown).trim().slice(0, 60);
  if (req.body.color !== undefined) set['passport.color'] = req.body.color;
  if (Object.keys(set).length) await User.updateOne({ _id: req.user._id }, { $set: set });
  const u = await User.findById(req.user._id);
  res.json({ success: true, data: { homeTown: (u.passport && u.passport.homeTown) || '', color: (u.passport && u.passport.color) || 'black' } });
});
