// Turns one activity-log line from the server into words. Unknown actions still show (as their raw name), never a blank.
// tone: how the dot is coloured. ok = something went live or was approved, warn = hidden / rejected / signed out, bad = deleted, idle = the rest.
const A = {
  'spot.created': ['added', 'ok'], 'spot.updated': ['edited', 'idle'], 'spot.published': ['published', 'ok'], 'spot.draft': ['moved to draft', 'warn'],
  'spot.archived': ['archived', 'warn'], 'spot.featured': ['featured', 'ok'], 'spot.unfeatured': ['removed from featured', 'warn'], 'spot.deleted': ['deleted', 'bad'],
  'spot.bulk_published': ['published', 'ok'], 'spot.bulk_draft': ['moved to draft', 'warn'], 'spot.bulk_archived': ['archived', 'warn'],
  'spot.bulk_featured': ['featured', 'ok'], 'spot.bulk_unfeatured': ['removed from featured', 'warn'], 'spot.bulk_deleted': ['deleted', 'bad'],
  'review.approved': ['approved', 'ok'], 'review.rejected': ['rejected', 'warn'], 'review.pending': ['moved back to pending', 'warn'], 'review.deleted': ['deleted', 'bad'],
  'review.bulk_approved': ['approved', 'ok'], 'review.bulk_rejected': ['rejected', 'warn'], 'review.bulk_pending': ['moved back to pending', 'warn'], 'review.bulk_deleted': ['deleted', 'bad'],
  'user.role_changed': ['changed the role of', 'idle'], 'user.suspended': ['suspended', 'warn'], 'user.activated': ['reactivated', 'ok'], 'user.deleted': ['deleted the account of', 'bad'],
  'user.signed_out': ['signed out', 'warn'], 'user.unlocked': ['unlocked', 'ok'],
  'category.created': ['added the category', 'ok'], 'category.updated': ['edited the category', 'idle'], 'category.deleted': ['deleted the category', 'bad'],
  'export.spots': ['exported', 'idle'], 'export.users': ['exported', 'idle'], 'export.reviews': ['exported', 'idle'], 'export.activity': ['exported', 'idle'],
};
const ICON = { spot: 'spots', user: 'users', review: 'reviews', category: 'categories', export: 'download', system: 'activity' };

export function describeAction(entry = {}) {
  const [verb, tone] = A[entry.action] || [entry.action || 'did something', 'idle'];
  return { verb, tone, icon: ICON[entry.targetType] || 'activity' };
}

// "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", then a plain date. Future dates (a slow clock) read as "just now".
export function timeAgo(value, now = Date.now()) {
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 14) return `${d} days ago`;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: new Date(t).getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric' });
}

// "Today", "Yesterday", "Monday 10 November": the heading above a day's lines in the activity list (the viewer's own calendar days).
export function dayLabel(value, now = Date.now()) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date(now)) - start(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric' });
}
