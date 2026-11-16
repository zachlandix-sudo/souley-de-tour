import { useCallback, useEffect, useRef, useState } from 'react';

// Generates a soft "ocean wave" ambience with the Web Audio API (no audio files needed):
// low-passed brown noise whose volume swells slowly, like waves.
export function useSoundscape() {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const supported = typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);

  const stop = useCallback(() => {
    const r = ref.current;
    ref.current = null;
    if (r) { try { r.source.stop(); r.lfo.stop(); r.ctx.close(); } catch { /* already closed */ } }
    setPlaying(false);
  }, []);

  const start = useCallback(() => {
    if (!supported || ref.current) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const len = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i += 1) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // brown noise
      data[i] = last * 3.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 650;
    const gain = ctx.createGain();
    gain.gain.value = 0.3;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11; // one swell about every 9 seconds
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.22;
    lfo.connect(lfoGain).connect(gain.gain);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    lfo.start();
    ctx.resume?.();
    ref.current = { ctx, source, lfo };
    setPlaying(true);
  }, [supported]);

  const toggle = useCallback(() => (ref.current ? stop() : start()), [start, stop]);
  useEffect(() => stop, [stop]);
  return { playing, supported, toggle };
}
