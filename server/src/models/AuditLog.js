const mongoose = require('mongoose');

// One line per thing a staff member did in the admin (published a spot, changed a role, exported a list...).
// actorName / actorRole are copied in on purpose: the line must still read correctly after that account is deleted.
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, maxlength: 120 },
    actorRole: { type: String, maxlength: 20 },
    action: { type: String, required: true, maxlength: 60 }, // 'spot.published', 'user.role_changed', 'export.spots' ...
    targetType: { type: String, required: true, enum: ['spot', 'user', 'review', 'category', 'export', 'system'] },
    targetId: { type: String, maxlength: 60 },
    targetLabel: { type: String, maxlength: 200 },
    detail: { type: String, maxlength: 400 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'auditLogs' }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ targetType: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
