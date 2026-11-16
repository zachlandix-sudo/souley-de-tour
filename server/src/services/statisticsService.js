'use strict';
const { DEFAULT_RANGE, DEFAULT_TZ, buildBuckets, fillSeries, enumSlices, topWithOther, ratingBars, ratingAverage, sumValues } = require('../utils/statistics');

const STATUS = { published: 'Published', draft: 'Draft', archived: 'Archived' };
const DIFFICULTY = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };
const REVIEWS = { approved: 'Approved', pending: 'Pending', rejected: 'Rejected' };
const ROLES = { visitor: 'Visitors', editor: 'Editors', admin: 'Admins' };
const TOWN_BARS = 10;
const CATEGORY_BARS = 8;

// Everything the admin dashboard charts, in one object. `models` is injected (the real Mongoose models in the controller,
// small fakes in the tests). Every database call is an aggregation or a count, run in parallel.
async function buildStatistics(models, { range = DEFAULT_RANGE, now = new Date(), tz = DEFAULT_TZ } = {}) {
  const { TouristSpot, Review, User, Itinerary, AiConversation, Category } = models;
  const { buckets, unit, format, since, range: usedRange } = buildBuckets(range, now, tz);

  const perBucket = (Model) => Model.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format, date: '$createdAt', timezone: tz } }, n: { $sum: 1 } } },
  ]);
  const countBy = (Model, field, match) => Model.aggregate([
    ...(match ? [{ $match: match }] : []),
    { $group: { _id: `$${field}`, n: { $sum: 1 } } },
  ]);

  const [
    newUsers, newSpots, newReviews, newTrips, newChats,
    spotStatus, spotDifficulty, spotTowns, categoryRows, categories,
    reviewStatus, ratingRows, userRole, tripOrigin, spotTotals, chatTotal,
  ] = await Promise.all([
    perBucket(User), perBucket(TouristSpot), perBucket(Review), perBucket(Itinerary), perBucket(AiConversation),
    countBy(TouristSpot, 'status'),
    countBy(TouristSpot, 'difficulty'),
    countBy(TouristSpot, 'municipality'),
    TouristSpot.aggregate([
      { $unwind: '$categoryIds' },
      { $group: { _id: '$categoryIds', n: { $sum: 1 }, views: { $sum: '$viewCount' } } },
    ]),
    Category.find({}, 'name').lean(),
    countBy(Review, 'status'),
    countBy(Review, 'rating', { status: 'approved' }),
    countBy(User, 'role'),
    countBy(Itinerary, 'generatedByAI'),
    TouristSpot.aggregate([{ $group: { _id: null, views: { $sum: '$viewCount' }, favorites: { $sum: '$favoriteCount' } } }]),
    AiConversation.countDocuments(),
  ]);

  const names = new Map(categories.map((c) => [String(c._id), c.name]));
  const categoryName = (id) => names.get(String(id)) || 'Uncategorised';

  const towns = spotTowns
    .map((r) => ({ key: String(r._id), label: r._id || 'Not set', value: Number(r.n) || 0 }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const ratings = ratingBars(ratingRows);
  const aiTrips = tripOrigin.filter((r) => r._id === true).reduce((s, r) => s + (Number(r.n) || 0), 0);
  const allTrips = sumValues(tripOrigin.map((r) => ({ value: r.n })));

  const pies = {
    spotStatus: enumSlices(spotStatus, Object.keys(STATUS), STATUS),
    spotCategory: topWithOther(categoryRows.map((r) => ({ key: String(r._id), label: categoryName(r._id), value: Number(r.n) || 0 })), 7),
    spotDifficulty: enumSlices(spotDifficulty, Object.keys(DIFFICULTY), DIFFICULTY),
    reviewStatus: enumSlices(reviewStatus, Object.keys(REVIEWS), REVIEWS),
    userRole: enumSlices(userRole, Object.keys(ROLES), ROLES),
    tripOrigin: [{ key: 'ai', label: 'Planned by Ask SOULEY', value: aiTrips }, { key: 'hand', label: 'Built by hand', value: allTrips - aiTrips }],
  };

  const bars = {
    towns: { items: towns.slice(0, TOWN_BARS), total: towns.length },
    categoryViews: categoryRows
      .map((r) => ({ key: String(r._id), label: categoryName(r._id), value: Number(r.views) || 0 }))
      .filter((i) => i.value > 0)
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
      .slice(0, CATEGORY_BARS),
    ratings,
  };

  const totals = spotTotals[0] || {};
  return {
    range: usedRange,
    unit,
    timezone: tz,
    generatedAt: now.toISOString(),
    totals: {
      spots: sumValues(pies.spotStatus),
      views: Number(totals.views) || 0,
      favorites: Number(totals.favorites) || 0,
      reviews: sumValues(pies.reviewStatus),
      users: sumValues(pies.userRole),
      trips: allTrips,
      aiChats: Number(chatTotal) || 0,
      averageRating: ratingAverage(ratings),
    },
    timeline: {
      unit,
      keys: buckets.map((b) => b.key),
      labels: buckets.map((b) => b.label),
      series: {
        users: fillSeries(buckets, newUsers),
        spots: fillSeries(buckets, newSpots),
        reviews: fillSeries(buckets, newReviews),
        trips: fillSeries(buckets, newTrips),
        aiChats: fillSeries(buckets, newChats),
      },
    },
    pies,
    bars,
  };
}

module.exports = { buildStatistics };
