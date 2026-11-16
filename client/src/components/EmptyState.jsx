export default function EmptyState({ title, actionLabel, onAction }) {
  return (
    <div className="border border-dashed border-line bg-paper p-10 text-center">
      <p className="font-display text-2xl text-ink">{title}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn btn-dark mt-5">{actionLabel}</button>
      )}
    </div>
  );
}
