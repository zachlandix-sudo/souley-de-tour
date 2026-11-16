import { vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// IntroSplash decides at import time whether to play, so each test loads a fresh copy of it.
async function load({ reduce = false, seen = false } = {}) {
  vi.resetModules();
  sessionStorage.clear();
  if (seen) sessionStorage.setItem('souley-intro', '1');
  vi.stubGlobal('matchMedia', () => ({ matches: reduce, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  return import('./IntroSplash');
}

describe('IntroSplash', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); delete document.documentElement.dataset.introSkip; });

  it('plays on the first visit: the name is drawn in both halves, hidden from screen readers', async () => {
    const { default: IntroSplash } = await load();
    render(<IntroSplash />);
    const root = screen.getByTestId('intro-splash');
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root.querySelectorAll('.splash-name')).toHaveLength(2);
    expect(root.querySelectorAll('.contours-draw path').length).toBeGreaterThan(5);
  });

  it('has no route line or town dots, but keeps the counter place name, the seam and a skip hint', async () => {
    const { default: IntroSplash } = await load();
    render(<IntroSplash />);
    const root = screen.getByTestId('intro-splash');
    expect(root.querySelectorAll('.splash-route')).toHaveLength(0);
    expect(root.querySelectorAll('.splash-contours path.accent')).toHaveLength(1); // one orange contour line (with its halo)
    expect(root.querySelectorAll('.splash-contours path.accent-glow')).toHaveLength(1);
    expect(root.querySelectorAll('.r-dot, .r-label')).toHaveLength(0);
    expect(root.querySelector('.splash-place')).toHaveTextContent('Maasin');
    expect(root.querySelector('.splash-skip')).toBeInTheDocument();
    expect(root.querySelector('.splash-seam')).toBeInTheDocument();
  });

  it('builds the name as solid 3D letters: 4 depth layers behind each of the 6 letters, in both curtain halves', async () => {
    const { default: IntroSplash } = await load();
    render(<IntroSplash />);
    const root = screen.getByTestId('intro-splash');
    expect(root.querySelectorAll('.l3d')).toHaveLength(12);
    expect(root.querySelectorAll('.l3d-side')).toHaveLength(48);
    expect(root.querySelectorAll('.l3d-front')).toHaveLength(12);
  });

  it('does not play again in the same session, or with reduced motion', async () => {
    let m = await load({ seen: true });
    render(<m.default />);
    expect(screen.queryByTestId('intro-splash')).toBeNull();
    expect(m.introDelayNow()).toBe(0);
    m = await load({ reduce: true });
    expect(m.introDelayNow()).toBe(0);
  });

  it('removes itself after the curtain and gives the page text no more delay', async () => {
    vi.useFakeTimers();
    const m = await load();
    render(<m.default />);
    expect(m.introDelayNow()).toBeGreaterThan(m.CURTAIN_AT - 0.5); // headlines mounted now wait for the curtain
    act(() => { vi.advanceTimersByTime(6000); });
    expect(screen.queryByTestId('intro-splash')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('a click skips it: it fades out fast and page headlines stop waiting', async () => {
    vi.useFakeTimers();
    const m = await load();
    render(<m.default />);
    act(() => { window.dispatchEvent(new Event('pointerdown')); });
    expect(screen.getByTestId('intro-splash')).toHaveClass('splash-leaving');
    expect(document.documentElement.dataset.introSkip).toBe('1');
    expect(m.introDelayNow()).toBe(0);
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.queryByTestId('intro-splash')).toBeNull();
  });

  it('does not replay when the layout is remounted after it ended (e.g. Map <-> Login)', async () => {
    vi.useFakeTimers();
    const m = await load();
    const first = render(<m.default />);
    act(() => { vi.advanceTimersByTime(6000); });
    expect(screen.queryByTestId('intro-splash')).toBeNull();
    first.unmount();
    render(<m.default />); // a new layout instance mounts
    expect(screen.queryByTestId('intro-splash')).toBeNull();
    expect(m.introDelayNow()).toBe(0);
  });
});
