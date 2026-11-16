import { passwordStrength } from '../../utils/passwordStrength';

const FILL = ['', 'bg-danger', 'bg-orange', 'bg-positive', 'bg-positive'];

export default function StrengthMeter({ password }) {
  const { score, label } = passwordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => <span key={n} className={`h-1 flex-1 ${n <= score ? FILL[score] : 'bg-line'}`} />)}
      </div>
      <p className="mt-1 text-xs text-muted">Strength: <span className="font-semibold text-ink">{label}</span></p>
    </div>
  );
}
