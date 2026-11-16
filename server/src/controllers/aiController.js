const AiConversation = require('../models/AiConversation');
const Itinerary = require('../models/Itinerary');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { recommend } = require('../services/aiService');

const save = async (user, question, result) => {
  if (!user) return;
  const msgs = [
    { role: 'user', content: question },
    { role: 'assistant', content: result.answer, spotIds: result.recommendations.map((r) => r.spotId) },
  ];
  await AiConversation.create({ userId: user._id, messages: msgs });
};

// POST /api/ai/recommendations
exports.recommendations = asyncHandler(async (req, res) => {
  const result = await recommend(req.body, { auto: true });
  await save(req.user, req.body.question, result);
  res.json({ success: true, data: result });
});

// POST /api/ai/itinerary   body.save=true (+ login) to store it
exports.itinerary = asyncHandler(async (req, res) => {
  const result = await recommend(req.body, { wantItinerary: true, auto: true });
  let saved;
  if (req.body.save) {
    if (!req.user) throw new AppError('Log in to save itinerary.', 401);
    saved = await Itinerary.create({
      userId: req.user._id,
      title: req.body.title || 'AI Itinerary',
      startDate: req.body.startDate,
      endDate: req.body.endDate || result.plan?.endDate,
      days: result.days,
      generatedByAI: true,
    });
  }
  await save(req.user, req.body.question, result);
  res.json({ success: true, data: result, saved });
});

// GET /api/ai/conversations
exports.conversations = asyncHandler(async (req, res) => {
  const data = await AiConversation.find({ userId: req.user._id }).sort({ updatedAt: -1 }).limit(20);
  res.json({ success: true, data });
});
