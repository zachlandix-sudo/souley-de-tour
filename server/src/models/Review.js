const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    touristSpotId: { type: mongoose.Schema.Types.ObjectId, ref: 'TouristSpot', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, maxlength: 120 },
    comment: { type: String, required: true, maxlength: 2000 },
    visitDate: Date,
    photos: [String],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true, collection: 'reviews' }
);

reviewSchema.index({ touristSpotId: 1 });
reviewSchema.index({ userId: 1 });
// one review per user per spot
reviewSchema.index({ touristSpotId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
