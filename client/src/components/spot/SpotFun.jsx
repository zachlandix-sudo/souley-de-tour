import { useEffect, useMemo, useRef, useState } from 'react';
import { useSpotWeather } from '../../hooks/useSpotWeather';
import { bestDayIndex, clock, peso, readList, splitCost, sunFraction, verdict, weekday, wmo, writeList } from '../../utils/fun';

// A short burst of confetti. Give it a new `go` number each time it should fire. Purely decorative (aria-hidden),
// and the CSS turns it off for visitors who asked for reduced motion.
const COLORS = ['#ff6a13', '#ffd166', '#ffffff', '#ff8a4c', '#7ddc9a'];
export function Burst({ go }) {
  const [live, setLive] = useState(0);
  useEffect(() => {
    if (!go) return undefined;
    setLive(go);
    const t = setTimeout(() => setLive(0), 1400);
    return () => clearTimeout(t);
  }, [go]);
  const bits = useMemo(() => Array.from({ length: 26 }, (_, i) => {
    const a = (i / 26) * Math.PI * 2 + (i % 3) * 0.2;
    const r = 70 + (i * 37) % 80;
    return { dx: Math.round(Math.cos(a) * r), dy: Math.round(Math.sin(a) * r - 30), rot: (i * 53) % 360, c: COLORS[i % COLORS.length], d: (i % 6) * 0.03 };
  }), []);
  if (!live) return null;
  return (
    <span className="burst" aria-hidden="true" key={live}>
      {bits.map((b, i) => <i key={i} style={{ '--dx': `${b.dx}px`, '--dy': `${b.dy}px`, '--rot': `${b.rot}deg`, '--c': b.c, animationDelay: `${b.d}s` }} />)}
    </span>
  );
}

// "Good for" tags under the facts strip.
export function GoodFor({ tags }) {
  if (!tags?.length) return null;
  return (
    <ul className="gf-row" aria-label="Good for">
      {tags.map((t, i) => <li key={t} className="gf-tag" style={{ animationDelay: `${i * 0.07}s` }}><span aria-hidden="true">✦</span>{t}</li>)}
    </ul>
  );
}

// ---- live weather and the week ahead ----
const ARC = { cx: 60, cy: 62, r: 50 };
function SunArc({ rise, set }) {
  const f = sunFraction(rise, set);
  const x = ARC.cx - ARC.r * Math.cos(Math.PI * f);
  const y = ARC.cy - ARC.r * Math.sin(Math.PI * f);
  return (
    <svg className="lv-arc" viewBox="0 0 120 70" role="img" aria-label={`Sunrise ${clock(rise)}, sunset ${clock(set)}`}>
      <path d={`M ${ARC.cx - ARC.r} ${ARC.cy} A ${ARC.r} ${ARC.r} 0 0 1 ${ARC.cx + ARC.r} ${ARC.cy}`} className="lv-arc-line" pathLength="1" />
      <line x1="4" y1={ARC.cy} x2="116" y2={ARC.cy} className="lv-arc-ground" />
      {f > 0 && f < 1 && <circle cx={x} cy={y} r="6" className="lv-orb" />}
    </svg>
  );
}

export function LiveStrip({ pos, name }) {
  const w = useSpotWeather(pos?.[0], pos?.[1]);
  if (!pos || w.loading || w.error || !w.days?.length) return null;
  const today = w.days[0];
  const now = wmo(w.code);
  const v = verdict({ code: w.code, wind: w.wind, rainChance: today?.rain });
  const best = bestDayIndex(w.days);
  return (
    <section className="lv" aria-label={`Right now at ${name}`}>
      <div className="lv-top">
        <div className="lv-now">
          <span className="lv-icon" aria-hidden="true">{now.icon}</span>
          <div>
            <p className="lv-kicker"><span className="lv-dot" aria-hidden="true" />Right now</p>
            <p className="lv-temp">{Number.isFinite(w.temp) ? `${Math.round(w.temp)}°C` : '--'} <small>{now.word}{Number.isFinite(w.wind) ? ` · wind ${Math.round(w.wind)} km/h` : ''}</small></p>
          </div>
        </div>
        <p className={`lv-verdict is-${v.tone}`}>{v.text}</p>
        {today?.rise && today?.set && (
          <div className="lv-sunbox">
            <SunArc rise={today.rise} set={today.set} />
            <p><b>{clock(today.rise)}</b> sunrise<br /><b>{clock(today.set)}</b> sunset</p>
          </div>
        )}
      </div>
      <ol className="lv-week" aria-label="Seven day outlook">
        {w.days.map((d, i) => {
          const dw = wmo(d.code);
          return (
            <li key={d.date} className={i === best ? 'is-best' : ''} style={{ animationDelay: `${i * 0.06}s` }}>
              <span className="lv-day">{i === 0 ? 'Today' : weekday(d.date)}</span>
              <span className="lv-ico" aria-hidden="true">{dw.icon}</span>
              <span className="lv-max">{Number.isFinite(d.max) ? `${Math.round(d.max)}°` : '--'}</span>
              <span className="lv-rain">{Number.isFinite(d.rain) ? `${Math.round(d.rain)}% rain` : ''}</span>
              {i === best && <span className="lv-best">Best day</span>}
            </li>
          );
        })}
      </ol>
      <p className="lv-fine">Live forecast for the spot's coordinates, from Open-Meteo. Conditions change, so check again before you leave.</p>
    </section>
  );
}

// ---- a checklist you can tick off (things to do, what to bring) ----
// Ticks are remembered on this device only. When every item is ticked, the bar fills and confetti fires.
export function TickList({ storeKey, items, label = 'done', variant = 'chips', title, warn = false }) {
  const [done, setDone] = useState(() => readList(storeKey).filter((x) => items.includes(x)));
  const [go, setGo] = useState(0);
  const wasAll = useRef(false);
  useEffect(() => { setDone(readList(storeKey).filter((x) => items.includes(x))); }, [storeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = items.length;
  const pct = total ? Math.round((done.length / total) * 100) : 0;
  useEffect(() => {
    const all = total > 0 && done.length === total;
    if (all && !wasAll.current) setGo((n) => n + 1);
    wasAll.current = all;
  }, [done, total]);
  const toggle = (item) => {
    setDone((cur) => {
      const next = cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item];
      writeList(storeKey, next);
      return next;
    });
  };
  const list = (
    <ul className={variant === 'chips' ? 'sd-chips' : 'tl-list'}>
      {items.map((t, i) => {
        const on = done.includes(t);
        return (
          <li key={`${t}-${i}`} className={variant === 'chips' ? '' : 'tl-li'}>
            <button type="button" className={`${variant === 'chips' ? 'sd-chip' : 'tl-item'} tl-btn ${on ? 'is-done' : ''}`} aria-pressed={on} onClick={() => toggle(t)}>
              <span className="tl-box" aria-hidden="true">{on ? '✓' : ''}</span>
              <span className="tl-text">{t}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
  const bar = (
    <div className="tl-progress">
      <span className="tl-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
      <span className="tl-count" aria-live="polite">{done.length} / {total} {label}{pct === 100 ? ' 🎉' : ''}</span>
    </div>
  );
  if (variant === 'chips') return <div className="tl-wrap">{bar}{list}<Burst go={go} /></div>;
  return (
    <section className={`sd-card tl-card ${warn ? 'is-warn' : ''}`}>
      <h2>{title}</h2>
      {bar}
      {list}
      <Burst go={go} />
    </section>
  );
}

// ---- trip cost splitter ----
export function CostSplitter({ perPerson, title = 'Plan your budget', max = 20 }) {
  const [people, setPeople] = useState(2);
  const { each, total } = splitCost(perPerson, people);
  const shown = useCount(total);
  if (!(each > 0)) return null;
  return (
    <section className="cs" aria-label={title}>
      <div className="cs-head">
        <h3>{title}</h3>
        <div className="cs-step" role="group" aria-label="Group size">
          <button type="button" aria-label="Fewer people" disabled={people <= 1} onClick={() => setPeople((n) => Math.max(1, n - 1))}>−</button>
          <span aria-live="polite"><b>{people}</b> {people === 1 ? 'person' : 'people'}</span>
          <button type="button" aria-label="More people" disabled={people >= max} onClick={() => setPeople((n) => Math.min(max, n + 1))}>+</button>
        </div>
      </div>
      <p className="cs-total"><span className="cs-peso" aria-hidden="true">₱</span><span aria-hidden="true">{Math.round(shown).toLocaleString('en-PH')}</span><span className="cs-sr">{peso(total)}</span></p>
      <p className="cs-note">Counts the spot’s estimate of {peso(each)} as one person’s share. Prices and fees change, so treat it as a guide.</p>
    </section>
  );
}

// A number that eases to its target (about 0.6 s). Reduced motion jumps straight there.
function useCount(target) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || typeof requestAnimationFrame !== 'function') { setV(target); from.current = target; return undefined; }
    const start = performance.now();
    const a = from.current;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 600);
      const e = 1 - (1 - t) ** 3;
      const cur = a + (target - a) * e;
      setV(cur);
      from.current = cur;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}
