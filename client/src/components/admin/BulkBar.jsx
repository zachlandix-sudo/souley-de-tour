// Appears at the bottom of a list when rows are ticked: how many, the actions (children) and Clear.
export default function BulkBar({ count, noun = 'item', onClear, children }) {
  if (!count) return null;
  return (
    <div className="adm-bulk" role="region" aria-label="Bulk actions">
      <p className="adm-bulk-count" aria-live="polite"><b>{count}</b> {noun}{count === 1 ? '' : 's'} selected</p>
      <div className="adm-bulk-actions">{children}</div>
      <button type="button" className="adm-bulk-clear" onClick={onClear}>Clear</button>
    </div>
  );
}
