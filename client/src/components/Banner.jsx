export default function Banner({ children, tone = 'error' }) {
  if (!children) return null;
  const cls = tone === 'error' ? 'border-danger bg-danger/5 text-danger' : 'border-positive bg-positive/5 text-positive';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`mb-4 border-l-4 px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}
