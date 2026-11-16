import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createSpot, getSpotForEdit, updateSpot } from '../../services/adminService';
import { listSpots } from '../../services/spotService';
import { listCategories } from '../../services/categoryService';
import { MONTH_LIST, WEEKDAYS, emptyValues, fromSpot, normalizeImageUrl, toApiBody, validateSpotForm } from '../../utils/spotForm';
import { errorMessage, fieldErrors } from '../../utils/errors';
import Banner from '../../components/Banner';
import Loading from '../../components/Loading';
import ErrorState from '../../components/ErrorState';
import AdminHeader from '../../components/admin/AdminHeader';
import { Icon } from '../../components/admin/Icons';

const input = 'mt-1.5 field';

// One numbered card of the form.
function Section({ n, title, hint, children }) {
  return (
    <section className="adm-card p-6 sm:p-8">
      <div className="mb-6 flex items-baseline gap-4 border-b border-[#f0ebe2] pb-4">
        <span aria-hidden="true" className="font-display text-3xl text-orange">{n}</span>
        <div><h2 className="font-display text-2xl leading-tight">{title}</h2>{hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}</div>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function ListInput({ label, values, onChange, error, placeholder, addLabel }) {
  const set = (i, v) => onChange(values.map((x, j) => (j === i ? v : x)));
  return (
    <fieldset className="text-sm">
      <legend className="adm-label">{label}</legend>
      <div className="mt-1 space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input aria-label={`${label} ${i + 1}`} value={v} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} className="field" />
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="btn btn-outline btn-sm" aria-label={`Remove ${label} ${i + 1}`}>Remove</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...values, ''])} className="mt-2 text-ember hover:underline">{addLabel || 'Add'}</button>
      {error && <p role="alert" className="mt-1 text-danger">{error}</p>}
    </fieldset>
  );
}

// Shows each photo link as a thumbnail so the admin sees at once whether it works, and which one the cards will use.
function ImagePreview({ urls, onChange }) {
  const [bad, setBad] = useState({});
  const items = urls.map((raw, i) => ({ u: normalizeImageUrl(raw), i })).filter((x) => x.u);
  if (items.length === 0) return null;
  const main = items.find((x) => !bad[x.u]);
  return (
    <div className="text-sm">
      <p className="adm-label">Photo preview <span className="font-normal text-muted">(the first photo that loads is the one on the spot and food cards)</span></p>
      <ul className="mt-2 flex flex-wrap gap-3">
        {items.map(({ u, i }) => (
          <li key={`${i}-${u}`} className="w-36">
            <div className={`relative h-24 w-36 overflow-hidden bg-paper ${main?.u === u ? 'outline outline-2 outline-orange' : ''}`}>
              {bad[u]
                ? <span className="absolute inset-0 flex items-center justify-center px-2 text-center text-xs text-danger">Can’t load this link</span>
                : <img src={u} alt="" referrerPolicy="no-referrer" onError={() => setBad((b) => ({ ...b, [u]: true }))} className="h-full w-full object-cover" />}
            </div>
            <div className="mt-1 flex items-center justify-between">
              {main?.u === u ? <span className="font-semibold text-ember">Card photo</span> : <span className="text-muted">{bad[u] ? 'Not shown' : 'Extra'}</span>}
              {i !== 0 && !bad[u] && <button type="button" onClick={() => onChange([urls[i], ...urls.filter((_, j) => j !== i)])} className="text-ember hover:underline">Make main</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Toggle chips (real checkboxes underneath) for a short fixed list, such as the days of the week. Nothing ticked is a valid answer.
// options: [{ value, short, full }]; the selection is always kept in the order of the options.
function ChipGroup({ legend, hint, options, selected, onChange, shortcuts = [] }) {
  const order = options.map((o) => o.value);
  const toggle = (value) => {
    const next = selected.includes(value) ? selected.filter((x) => x !== value) : [...selected, value];
    onChange(order.filter((x) => next.includes(x)));
  };
  return (
    <fieldset className="text-sm">
      <legend className="adm-label">{legend}</legend>
      {hint && <p className="mt-0.5 text-muted">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <label key={o.value} title={o.full} className={`inline-flex min-w-[3.25rem] cursor-pointer select-none items-center justify-center border px-3 py-1.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-orange ${on ? 'border-ember bg-ember text-white' : 'border-[#d9d2c5] bg-white hover:border-ember'}`}>
              <input type="checkbox" className="sr-only" checked={on} aria-label={o.full} onChange={() => toggle(o.value)} />
              {o.short}
            </label>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {shortcuts.map((sc) => <button key={sc.label} type="button" onClick={() => onChange(sc.values)} className="text-ember hover:underline">{sc.label}</button>)}
      </div>
    </fieldset>
  );
}

function CheckList({ legend, options, selected, onChange }) {
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <fieldset className="text-sm">
      <legend className="adm-label">{legend}</legend>
      <div className="mt-1.5 max-h-44 space-y-1 overflow-y-auto border border-[#d9d2c5] bg-white p-3">
        {options.length === 0 && <p className="text-muted">None available.</p>}
        {options.map((o) => (
          <label key={o.id} className="flex items-center gap-2">
            <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} /> {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function SpotForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [v, setV] = useState(emptyValues());
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const [categories, setCategories] = useState([]);
  const [others, setOthers] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => {});
    listSpots({ limit: 50 }).then((r) => setOthers(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editing) return undefined;
    let live = true;
    setLoading(true);
    setLoadError(null);
    getSpotForEdit(id)
      .then((s) => live && setV(fromSpot(s)))
      .catch((e) => live && setLoadError(e))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [id, editing, tick]);

  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const setList = (k) => (list) => setV((s) => ({ ...s, [k]: list }));

  async function onSubmit(e) {
    e.preventDefault();
    if (inFlight.current) return;
    const found = validateSpotForm(v);
    setErrors(found);
    setBanner('');
    if (Object.keys(found).length) { setBanner('Fix the highlighted fields and save again.'); return; }
    inFlight.current = true;
    setSaving(true);
    try {
      const body = toApiBody(v);
      if (editing) await updateSpot(id, body); else await createSpot(body);
      navigate('/admin/spots');
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      setBanner(Object.keys(fe).length ? 'Fix the highlighted fields and save again.' : errorMessage(err));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  if (loadError) return <ErrorState message={loadError.response?.status === 404 ? 'That spot no longer exists.' : errorMessage(loadError)} onRetry={() => setTick((t) => t + 1)} />;

  const catOptions = categories.map((c) => ({ id: c._id, label: c.name }));
  const nearOptions = others.filter((s) => s._id !== id).map((s) => ({ id: s._id, label: s.name }));

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-4xl">
      <AdminHeader eyebrow="Spots" title={editing ? 'Edit spot' : 'Add spot'} subtitle="Name, both descriptions, municipality and at least one photo link are required. The rest is optional.">
        <Link to="/admin/spots" className="inline-flex items-center gap-1.5 text-sm font-medium text-ember hover:underline">Back to spots</Link>
      </AdminHeader>
      <Banner>{banner}</Banner>
      <div className="space-y-6">
      <Section n="01" title="The basics" hint="What visitors read first.">

      <div><label className="adm-label" htmlFor="f-name">Name</label>
        <input id="f-name" value={v.name} onChange={set('name')} className={input} />
        {errors.name && <p role="alert" className="mt-1 text-sm text-danger">{errors.name}</p>}</div>

      <div><label className="adm-label" htmlFor="f-short">Short description</label>
        <textarea id="f-short" rows={2} value={v.shortDescription} onChange={set('shortDescription')} className={input} />
        <p className={`mt-1 text-xs ${v.shortDescription.length > 300 ? 'text-danger' : 'text-muted'}`}>{v.shortDescription.length}/300</p>
        {errors.shortDescription && <p role="alert" className="text-sm text-danger">{errors.shortDescription}</p>}</div>

      <div><label className="adm-label" htmlFor="f-desc">Description</label>
        <textarea id="f-desc" rows={6} value={v.description} onChange={set('description')} className={input} />
        {errors.description && <p role="alert" className="mt-1 text-sm text-danger">{errors.description}</p>}</div>

      <CheckList legend="Categories" options={catOptions} selected={v.categoryIds} onChange={setList('categoryIds')} />
      </Section>

      <Section n="02" title="Where it is" hint="The map pin uses latitude and longitude.">
      <div className="grid gap-6 sm:grid-cols-2">
        <div><label className="adm-label" htmlFor="f-muni">Municipality</label>
          <input id="f-muni" value={v.municipality} onChange={set('municipality')} className={input} />
          {errors.municipality && <p role="alert" className="mt-1 text-sm text-danger">{errors.municipality}</p>}</div>
        <div><label className="adm-label" htmlFor="f-brgy">Barangay</label>
          <input id="f-brgy" value={v.barangay} onChange={set('barangay')} className={input} /></div>
        <div className="sm:col-span-2"><label className="adm-label" htmlFor="f-addr">Address</label>
          <input id="f-addr" value={v.address} onChange={set('address')} className={input} /></div>
        <div><label className="adm-label" htmlFor="f-lat">Latitude</label>
          <input id="f-lat" inputMode="decimal" value={v.latitude} onChange={set('latitude')} className={input} />
          {errors.latitude && <p role="alert" className="mt-1 text-sm text-danger">{errors.latitude}</p>}</div>
        <div><label className="adm-label" htmlFor="f-lng">Longitude</label>
          <input id="f-lng" inputMode="decimal" value={v.longitude} onChange={set('longitude')} className={input} />
          {errors.longitude && <p role="alert" className="mt-1 text-sm text-danger">{errors.longitude}</p>}</div>
      </div>

      </Section>

      <Section n="03" title="Photos" hint="Paste a direct image link. The first photo that loads is the card photo.">
      <ListInput label="Image URL" values={v.images} onChange={setList('images')} error={errors.images} placeholder="https://…" addLabel="Add image" />
      <ImagePreview urls={v.images} onChange={setList('images')} />
      </Section>

      <Section n="04" title="Plan the visit" hint="Helps visitors choose and prepare.">
      <ListInput label="Activity" values={v.activities} onChange={setList('activities')} placeholder="e.g. Snorkeling" addLabel="Add activity" />

      <div className="grid gap-6 sm:grid-cols-2">
        <div><label className="adm-label" htmlFor="f-fee">Entrance fee</label>
          <input id="f-fee" value={v.entranceFee} onChange={set('entranceFee')} className={input} placeholder="Free" /></div>
        <div><label className="adm-label" htmlFor="f-budget">Estimated budget (₱)</label>
          <input id="f-budget" inputMode="decimal" value={v.estimatedBudget} onChange={set('estimatedBudget')} className={input} />
          {errors.estimatedBudget && <p role="alert" className="mt-1 text-sm text-danger">{errors.estimatedBudget}</p>}</div>
        <div><label className="adm-label" htmlFor="f-dur">Recommended duration</label>
          <input id="f-dur" value={v.recommendedDuration} onChange={set('recommendedDuration')} className={input} /></div>
        <div><label className="adm-label" htmlFor="f-best">Best time to visit</label>
          <input id="f-best" value={v.bestTimeToVisit} onChange={set('bestTimeToVisit')} className={input} /></div>
        <div><label className="adm-label" htmlFor="f-diff">Difficulty</label>
          <select id="f-diff" value={v.difficulty} onChange={set('difficulty')} className={input}>
            <option value="easy">Easy</option><option value="moderate">Moderate</option><option value="hard">Hard</option>
          </select></div>
        <div><label className="adm-label" htmlFor="f-acc">Accessibility</label>
          <input id="f-acc" value={v.accessibility} onChange={set('accessibility')} className={input} /></div>
      </div>

      <ChipGroup legend="Open days" hint="Tick the days it is open. Leave all unticked if it is open every day, or you do not know. The trip planner will not schedule it on a closed day."
        options={WEEKDAYS.map(([short, full]) => ({ value: short, short, full }))} selected={v.openDays} onChange={setList('openDays')}
        shortcuts={[{ label: 'Every day', values: [] }, { label: 'Mon–Fri', values: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }, { label: 'Mon–Sat', values: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }]} />
      <ChipGroup legend="Best months" hint="Tick the months it is at its best. Leave all unticked if it is good all year. For a trip in another month the planner can still use it, but ranks it lower."
        options={MONTH_LIST.map((full, i) => ({ value: i + 1, short: full.slice(0, 3), full }))} selected={v.bestMonths} onChange={setList('bestMonths')}
        shortcuts={[{ label: 'All year', values: [] }]} />

      <ListInput label="What to bring" values={v.whatToBring} onChange={setList('whatToBring')} addLabel="Add item" />
      <ListInput label="Safety tip" values={v.safetyTips} onChange={setList('safetyTips')} addLabel="Add tip" />

      </Section>

      <Section n="05" title="Contact and nearby" hint="Who to call, and what is close by.">
      <div className="grid gap-6 sm:grid-cols-3">
        <div><label className="adm-label" htmlFor="f-cn">Contact name</label>
          <input id="f-cn" value={v.contactName} onChange={set('contactName')} className={input} /></div>
        <div><label className="adm-label" htmlFor="f-cp">Contact phone</label>
          <input id="f-cp" value={v.contactPhone} onChange={set('contactPhone')} className={input} /></div>
        <div><label className="adm-label" htmlFor="f-ce">Contact email</label>
          <input id="f-ce" value={v.contactEmail} onChange={set('contactEmail')} className={input} />
          {errors.contactEmail && <p role="alert" className="mt-1 text-sm text-danger">{errors.contactEmail}</p>}</div>
      </div>

      <CheckList legend="Nearby spots (published)" options={nearOptions} selected={v.nearbySpotIds} onChange={setList('nearbySpotIds')} />

      </Section>

      <Section n="06" title="Publishing" hint="Draft spots are only visible here.">
      <div className="flex flex-wrap items-end gap-8">
        <div><label className="adm-label" htmlFor="f-status">Status</label>
          <select id="f-status" value={v.status} onChange={set('status')} className={input}>
            <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
          </select></div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={v.isFeatured} onChange={(e) => setV((s) => ({ ...s, isFeatured: e.target.checked }))} /> Featured on the home page
        </label>
      </div>

      </Section>
      </div>

      <div className="adm-savebar">
        <p className="hidden text-sm text-muted sm:block">{editing ? 'Editing an existing spot' : 'New spot'}</p>
        <div className="ml-auto flex gap-3">
          <Link to="/admin/spots" className="btn btn-outline">Cancel</Link>
          <button type="submit" disabled={saving} className="btn btn-dark">
            {saving ? 'Saving…' : <><Icon name="check" className="h-4 w-4" /> Save spot</>}
          </button>
        </div>
      </div>
    </form>
  );
}
