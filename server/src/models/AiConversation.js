const mongoose = require('mongoose');

const aiConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        spotIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TouristSpot' }],
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, collection: 'aiConversations' }
);

aiConversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('AiConversation', aiConversationSchema);
