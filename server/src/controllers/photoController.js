const asyncHandler = require('../utils/asyncHandler');
const { searchPhoto } = require('../services/photoService');

// GET /api/photos?q=waterfall%20Philippines -> { success, data: { url, credit, creditUrl, source } | null }
// "No photo" is a normal answer (data: null), not an error: the card just keeps its design.
exports.search = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2 || q.length > 80) return res.status(400).json({ success: false, message: 'q must be 2 to 80 characters.' });
  const photo = await searchPhoto(q);
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({ success: true, data: photo });
});
