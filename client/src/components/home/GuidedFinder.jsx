import { BUDGET, ENERGY } from '../../utils/homeFinder';
import { useI18n } from '../../i18n/I18nContext';

function Group({ legend, caption, options, value, onPick }) {
  const { tx } = useI18n();
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-white">{legend}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onPick(o.id)}
            className={`gf-chip isolate rounded-sm border px-4 py-2 text-sm font-medium ${value === o.id ? 'border-orange text-night' : 'border-white/30 text-white hover:border-white'}`}>
            {tx(o.label)}
          </button>
        ))}
      </div>
      {caption && <p className="mt-2 text-xs text-white/60">{caption}</p>}
    </fieldset>
  );
}

// "What kind of day do you want?" Two taps, then the page shows matching spots.
export default function GuidedFinder({ answers, onChange }) {
  const { t } = useI18n();
  const set = (k) => (id) => onChange({ ...answers, [k]: id });
  return (
    <section aria-labelledby="finder-title" className="border border-white/15 border-t-orange bg-graphite p-6 sm:p-8" style={{ borderTopWidth: 2 }}>
      <h2 id="finder-title" className="text-3xl">{t('finder.title')}</h2>
      <div className="mt-6 grid gap-7">
        <Group legend={t('finder.energy')} caption={t('finder.energyCap')} options={ENERGY} value={answers.energy} onPick={set('energy')} />
        <Group legend={t('finder.budget')} caption={t('finder.budgetCap')} options={BUDGET} value={answers.budget} onPick={set('budget')} />
      </div>
    </section>
  );
}
