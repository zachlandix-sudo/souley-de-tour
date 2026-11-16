export default function Rating({ value, count }) {
  if (!count) return <span className="text-sm text-muted">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span aria-hidden="true" className="text-orange">★</span>
      <span className="font-semibold text-ink">{Number(value).toFixed(1)}</span>
      <span className="text-muted">({count})</span>
    </span>
  );
}
