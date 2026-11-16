import { useI18n } from '../i18n/I18nContext';
export default function Loading({ label }) {
  const { t } = useI18n();
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-orange" aria-hidden="true" />
      <span>{label ?? t('common.loading')}…</span>
    </div>
  );
}

export function SkeletonRows({ count = 4 }) {
  return (
    <div aria-busy="true" aria-label="Loading spots" className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-line py-4 pl-4">
          <div className="h-28 w-36 shrink-0 animate-pulse bg-paper" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-1/2 animate-pulse bg-paper" />
            <div className="h-3 w-1/3 animate-pulse bg-paper" />
            <div className="h-3 w-full animate-pulse bg-paper" />
          </div>
        </div>
      ))}
    </div>
  );
}
