const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { PASSPORT_COLORS } = require('../utils/passport');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['visitor', 'editor', 'admin'], default: 'visitor' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    favoriteTouristSpots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TouristSpot' }],
    // Leyte Passport: the stamps stay out of every normal user query (select: false); the passport routes ask for them.
    stamps: {
      type: [{ _id: false, spot: { type: mongoose.Schema.Types.ObjectId, ref: 'TouristSpot', required: true }, at: { type: Date, required: true }, method: { type: String, enum: ['gps', 'manual'], default: 'gps' } }],
      select: false,
      default: [],
    },
    // The visitor's passport page: home town and cover colour (small, so it travels with the user).
    passport: {
      homeTown: { type: String, trim: true, maxlength: 60, default: '' },
      color: { type: String, enum: PASSPORT_COLORS, default: 'black' },
    },
    lastLogin: Date,
    tokenVersion: { type: Number, default: 0 }, // bump to invalidate every existing session
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: Date,
  },
  { timestamps: true, collection: 'users' }
);

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, 12);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.tokenVersion;
    delete ret.failedLoginCount;
    delete ret.lockUntil;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
