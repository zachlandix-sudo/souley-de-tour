import { CARD, downloadBlob, drawPassportCard, MAX_CARD_STAMPS, passportCardBlob } from './passportCard';

// A drawing context that records what is drawn instead of drawing it.
function recorder() {
  const texts = [];
  const calls = [];
  const grad = { addColorStop: () => {} };
  const ctx = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'texts') return texts;
      if (prop === 'calls') return calls;
      if (prop === 'measureText') return (s) => ({ width: String(s).length * 12 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => grad;
      return (...args) => { calls.push(prop); if (prop === 'fillText') texts.push(args[0]); };
    },
    set() { return true; },
  });
  return ctx;
}

const stamp = (i, extra = {}) => ({ id: `spot-${i}`, name: `Spot number ${i}`, municipality: `Town ${i}`, at: `2026-10-${String(10 + i).padStart(2, '0')}T08:00:00.000Z`, ...extra });
const base = (over = {}) => ({
  color: 'navy', title: 'Leyte Passport', rankLabel: 'Wanderer', count: 6, total: 58, townsVisited: 3, badgeTowns: ['Sogod'],
  stamps: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => stamp(i)), holder: { name: 'Maria Santos', homeTown: 'Cebu City', number: 'SDT-F0ABC1' },
  origin: 'souley.example/passport', locale: 'en-PH', labels: { stamps: 'Stamps', towns: 'Towns', badges: 'Badges', guest: 'Guest traveller' }, ...over,
});

describe('passport share card', () => {
  it('is a 1080 x 1350 picture', () => {
    expect(CARD).toEqual({ w: 1080, h: 1350 });
  });

  it('writes the title, rank, holder, numbers, badges and address', () => {
    const ctx = recorder();
    drawPassportCard(ctx, base());
    for (const text of ['Leyte Passport', 'SOULEY de Tour', 'Wanderer', 'Maria Santos', 'Cebu City   ·   SDT-F0ABC1', '6', '3', '1', 'Badges: Sogod', 'souley.example/passport']) {
      expect(ctx.texts).toContain(text);
    }
    expect(ctx.texts).toContain('STAMPS');
  });

  it('draws only the newest few stamps, each with its town and spot name', () => {
    const ctx = recorder();
    drawPassportCard(ctx, base());
    expect(ctx.texts.filter((t) => /^Spot number/.test(t))).toHaveLength(MAX_CARD_STAMPS);
    expect(ctx.texts).toContain('TOWN 1');
    expect(ctx.texts).not.toContain('Spot number 7');
  });

  it('shows "Guest traveller" for a guest and empty outlines when there are no stamps', () => {
    const ctx = recorder();
    drawPassportCard(ctx, base({ holder: null, count: 0, stamps: [], badgeTowns: [] }));
    expect(ctx.texts).toContain('Guest traveller');
    expect(ctx.calls).toContain('setLineDash');
    expect(ctx.texts.some((t) => /^Badges:/.test(t))).toBe(false);
  });

  it('copes with very long names and an unknown colour', () => {
    const ctx = recorder();
    const long = 'A very long name that would never fit on one line of the card '.repeat(3);
    expect(() => drawPassportCard(ctx, base({ color: 'pink', holder: { name: long, homeTown: long, number: '' }, stamps: [stamp(1, { name: long, municipality: long })] }))).not.toThrow();
    expect(ctx.texts.some((t) => t.endsWith('…'))).toBe(true);
  });

  it('gives back null where the browser cannot draw (no canvas)', async () => {
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(await passportCardBlob(base())).toBeNull();
    spy.mockRestore();
  });

  it('downloadBlob clicks a temporary link with the file name', () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadBlob(new Blob(['x']), 'card.png');
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
