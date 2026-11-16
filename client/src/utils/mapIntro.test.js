import { waveDelays, centerOf, WAVE_SPAN_S, JITTER_S, WAVE_TOTAL_MS, PIN_S } from './mapIntro.js';
import { beaconHtml } from './pinHtml.js';

describe('map opening sequence timing', () => {
  const items = [{ id: 'north', lat: 10.5 }, { id: 'south', lat: 9.9 }, { id: 'mid', lat: 10.2 }];

  it('lights pins from the south to the north', () => {
    const d = waveDelays(items);
    expect(d.get('south')).toBeLessThan(d.get('mid'));
    expect(d.get('mid')).toBeLessThan(d.get('north'));
  });
  it('keeps every delay inside the wave and repeats exactly', () => {
    const a = waveDelays(items), b = waveDelays(items);
    for (const it of items) {
      expect(a.get(it.id)).toBe(b.get(it.id));
      expect(a.get(it.id)).toBeGreaterThan(-0.001);
      expect(a.get(it.id)).toBeLessThan(WAVE_SPAN_S + JITTER_S + 0.001);
    }
  });
  it('copes with no pins, one pin, and pins at the same latitude', () => {
    expect(waveDelays([]).size).toBe(0);
    expect(waveDelays([{ id: 'a', lat: 10 }]).size).toBe(1);
    const same = waveDelays([{ id: 'a', lat: 10 }, { id: 'b', lat: 10 }]);
    expect(same.get('a')).toBeLessThan(JITTER_S + 0.001);
  });
  it('waits long enough for the last pin to finish its animation', () => {
    expect(WAVE_TOTAL_MS).toBeGreaterThan((WAVE_SPAN_S + JITTER_S + PIN_S) * 1000);
  });
  it('finds the middle of the pins', () => {
    const c = centerOf([[10, 124], [11, 126]]);
    expect(c[0]).toBe(10.5);
    expect(c[1]).toBe(125);
  });
  it('builds the opening pin with its delay and no beam or glow', () => {
    const html = beaconHtml('spot', 1.234);
    expect(html.includes('--d:1.23s')).toBe(true);
    expect(html.includes('pin-rise')).toBe(true);
    expect(html.includes('pin-beam') || html.includes('pin-glow')).toBe(false);
    expect(beaconHtml('food', 0).includes('#111')).toBe(true);
  });
});
