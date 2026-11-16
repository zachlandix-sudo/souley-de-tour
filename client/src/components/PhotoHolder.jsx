import Contours from './Contours';

function CameraIcon({ className = '' }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1-1.6A1.5 1.5 0 0 1 10 4.7h4a1.5 1.5 0 0 1 1.3.7l1 1.6h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

// The empty frame that waits for a photo. It scales with its box (container queries), so the same
// holder works as a 96px thumbnail or a full-width hero. While you build (npm run dev) it prints the
// exact file name to drop into client/public/. Visitors on the live site only see the frame and the icon.
export default function PhotoHolder({ alt, path = '', seed, className = '' }) {
  // Callers that position the holder themselves (absolute fill) keep their own; everyone else gets `relative`.
  const place = /\b(absolute|fixed|sticky)\b/.test(className) ? '' : 'relative';
  return (
    <div role="img" aria-label={alt} className={`@container ${place} isolate overflow-hidden bg-graphite ${className}`}>
      <Contours seed={seed || alt} width={400} height={500} levels={11} cell={20} className="absolute inset-0 -z-10 h-full w-full" />
      <div className="absolute inset-1.5 flex flex-col items-center justify-center gap-1.5 border border-dashed border-white/30 px-2 text-center text-white/75 @[8rem]:inset-3">
        <CameraIcon className="h-5 w-5 shrink-0 text-orange @[8rem]:h-8 @[8rem]:w-8" />
        <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] @[9rem]:block">Photo</span>
        {path && import.meta.env.DEV && (
          <code className="hidden max-w-full truncate font-mono text-[11px] text-white/60 @[13rem]:block">{path}</code>
        )}
      </div>
    </div>
  );
}
