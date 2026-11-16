const TouristSpot = require('../models/TouristSpot');
const Review = require('../models/Review');
const User = require('../models/User');
const Itinerary = require('../models/Itinerary');
const AiConversation = require('../models/AiConversation');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { RANGES, parseRange, resolveTimeZone } = require('../utils/statistics');
const { buildStatistics } = require('../services/statisticsService');

exports.summary = asyncHandler(async (_req, res) => {
  const [totalSpots, publishedSpots, pendingReviews, users, itineraries, mostViewed, mostFavorited, recentSpots] = await Promise.all([
    TouristSpot.countDocuments(),
    TouristSpot.countDocuments({ status: 'published' }),
    Review.countDocuments({ status: 'pending' }),
    User.countDocuments(),
    Itinerary.countDocuments(),
    TouristSpot.find().sort({ viewCount: -1 }).limit(5).select('name slug viewCount'),
    TouristSpot.find().sort({ favoriteCount: -1 }).limit(5).select('name slug favoriteCount'),
    TouristSpot.find().sort({ updatedAt: -1 }).limit(5).select('name slug status updatedAt'),
  ]);
  res.json({
    success: true,
    data: { totalSpots, publishedSpots, pendingReviews, users, itineraries, mostViewed, mostFavorited, recentActivity: recentSpots },
  });
});

// GET /api/admin/statistics?range=7d|30d|90d|12m  -> the numbers behind the dashboard's line, bar and pie charts
exports.statistics = asyncHandler(async (req, res) => {
  const range = parseRange(req.query.range);
  if (!range) throw new AppError(`range must be one of: ${Object.keys(RANGES).join(', ')}.`, 400);
  const data = await buildStatistics(
    { TouristSpot, Review, User, Itinerary, AiConversation, Category },
    { range, tz: resolveTimeZone(process.env.STATS_TIMEZONE) }
  );
  res.json({ success: true, data });
});
