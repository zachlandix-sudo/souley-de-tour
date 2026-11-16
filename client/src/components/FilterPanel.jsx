import { DIFFICULTIES } from '../utils/query';
import { useI18n } from '../i18n/I18nContext';

export default function FilterPanel({ query, onChange }) {
  const { t } = useI18n();
  return (
    <form
      key={JSON.stringify([query.municipality, query.maxBudget, query.minRating, query.difficulty])}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onChange({
          municipality: String(f.get('municipality') || '').trim(),
          maxBudget: f.get('maxBudget') || '',
          minRating: f.get('minRating') || '',
          difficulty: f.get('difficulty') || '',
        });
      }}
      className="grid gap-4 border border-line bg-paper p-5 sm:grid-cols-2"
    >
      <label className="text-sm font-medium">{t('filter.municipality')}
        <input name="municipality" defaultValue={query.municipality || ''} className="field mt-1 font-normal" />
      </label>
      <label className="text-sm font-medium">{t('filter.maxBudget')}
        <input name="maxBudget" type="number" min="0" defaultValue={query.maxBudget ?? ''} className="field mt-1 font-normal" />
      </label>
      <label className="text-sm font-medium">{t('filter.minRating')}
        <select name="minRating" defaultValue={query.minRating ?? ''} className="field mt-1 font-normal">
          <option value="">{t('filter.any')}</option>
          {[3, 4, 4.5].map((r) => <option key={r} value={r}>{r}+</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">{t('filter.difficulty')}
        <select name="difficulty" defaultValue={query.difficulty || ''} className="field mt-1 font-normal">
          <option value="">{t('filter.any')}</option>
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{t(`diff.${d}`)}</option>)}
        </select>
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-dark">{t('filter.apply')}</button>
      </div>
    </form>
  );
}
