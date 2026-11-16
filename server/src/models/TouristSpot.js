const mongoose = require('mongoose');

const touristSpotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    shortDescription: { type: String, required: true, maxlength: 300 },
    description: { type: String, required: true },
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    municipality: { type: String, required: true, trim: true },
    barangay: String,
    address: String,
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] }, // [lng, lat]
    },
    images: { type: [String], validate: (v) => v.length > 0 },
    activities: [String],
    // food places only: what kind of place it is (restaurant, cafe, bakery...). Shown as a badge on the Food page.
    entryType: { type: String, trim: true, lowercase: true },
    openingHours: { type: Map, of: String },
    entranceFee: { type: String, default: 'Free' },
    estimatedBudget: Number,
    recommendedDuration: String,
    bestTimeToVisit: String,
    // trip planner: days the place is open (empty = every day) and the months it is best to visit (empty = all year)
    openDays: { type: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }], default: [] },
    bestMonths: { type: [{ type: Number, min: 1, max: 12 }], default: [] },
    difficulty: { type: String, enum: ['easy', 'moderate', 'hard'], default: 'easy' },
    accessibility: String,
    whatToBring: [String],
    safetyTips: [String],
    contactName: String,
    contactPhone: String,
    contactEmail: String,
    nearbySpotIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TouristSpot' }],
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    isFeatured: { type: Boolean, default: false },
    seoTitle: String,
    seoDescription: String,
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'touristSpots' }
);

touristSpotSchema.index({ name: 'text', shortDescription: 'text', description: 'text', activities: 'text' });
touristSpotSchema.index({ municipality: 1 });
touristSpotSchema.index({ status: 1 });
touristSpotSchema.index({ categoryIds: 1 });
// 2dsphere only indexes docs that HAVE coordinates
touristSpotSchema.index({ location: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('TouristSpot', touristSpotSchema);
