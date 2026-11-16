// A ring of short bars, filled clockwise from the bottom left; the gap sits at the bottom. Decorative: the number and its
// caption are passed as children and carry the meaning.
const N = 60;
const START = 225; // degrees clockwise from 12 o'clock (7:30)
const SWEEP = 270;
const C = 130;
const R_IN = 98;
const R_OUT = 122;

export default function Gauge({ percent = 0, children }) {
  const on = Math.round((Math.min(100, Math.max(0, Number(percent) || 0)) / 100) * N);
  return (
    <div className="adm-gauge">
      <svg viewBox="0 0 260 260" aria-hidden="true" focusable="false">
        {Array.from({ length: N }, (_, i) => {
          const a = ((START + (SWEEP * i) / (N - 1)) * Math.PI) / 180;
          const s = Math.sin(a);
          const c = -Math.cos(a);
          return (
            <line key={i} className={`adm-tick${i < on ? ' on' : ''}`} style={{ '--i': i }}
              x1={(C + R_IN * s).toFixed(2)} y1={(C + R_IN * c).toFixed(2)} x2={(C + R_OUT * s).toFixed(2)} y2={(C + R_OUT * c).toFixed(2)} />
          );
        })}
      </svg>
      <div className="adm-gauge-center">{children}</div>
    </div>
  );
}
