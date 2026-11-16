const AuditLog = require('../models/AuditLog');

const clip = (v, n) => (v === undefined || v === null ? undefined : String(v).slice(0, n));

// Writes one activity line for the signed-in staff member. It must NEVER break the action it describes: a failed write is
// swallowed (and logged outside tests), the spot is still published, the role is still changed.
async function record(req, { action, targetType, targetId, targetLabel, detail }) {
  try {
    const u = (req && req.user) || {};
    await AuditLog.create({
      actor: u._id,
      actorName: clip(u.fullName, 120),
      actorRole: clip(u.role, 20),
      action,
      targetType,
      targetId: clip(targetId, 60),
      targetLabel: clip(targetLabel, 200),
      detail: clip(detail, 400),
    });
  } catch (e) {
    if (process.env.NODE_ENV !== 'test') console.warn('[audit] could not write an activity line:', e.message);
  }
}

// "Alpha, Beta, Gamma +2 more" for a bulk action's label.
const nameList = (names, max = 3) => {
  const list = names.filter(Boolean);
  if (list.length <= max) return list.join(', ');
  return `${list.slice(0, max).join(', ')} +${list.length - max} more`;
};

module.exports = { record, nameList };
