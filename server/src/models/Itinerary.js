const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    touristSpotId: { type: mongoose.Schema.Types.ObjectId, ref: 'TouristSpot', required: true },
    visitOrder: { type: Number, default: 1 },
    notes: String,
    estimatedBudget: Number,
  },
  { _id: false }
);

const daySchema = new mongoose.Schema(
  { dayNumber: { type: Number, required: true }, items: [itemSchema] },
  { _id: false }
);

const itinerarySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    startDate: Date,
    endDate: Date,
    days: [daySchema],
    notes: String,
    generatedByAI: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'itineraries' }
);

itinerarySchema.index({ userId: 1 });

module.exports = mongoose.model('Itinerary', itinerarySchema);
