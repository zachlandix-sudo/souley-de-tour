import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import { useInViewOnce } from './useInViewOnce';
import { useScrollDive } from './useScrollDive';

function InView() {
  const [ref, phase] = useInViewOnce();
  return <div ref={ref} data-testid="box" data-phase={phase} />;
}
function Dive() {
  const ref = useRef(null);
  useScrollDive(ref);
  return <section ref={ref} data-testid="hero" />;
}

let seen;
class FakeIO {
  constructor(cb) { this.cb = cb; seen = this; }
  observe() {}
  disconnect() {}
}
const realIO = globalThis.IntersectionObserver;
const realMatchMedia = window.matchMedia;
afterEach(() => { globalThis.IntersectionObserver = realIO; window.matchMedia = realMatchMedia; seen = undefined; });
const reduceMotion = () => { window.matchMedia = (q) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }); };

describe('useInViewOnce', () => {
  it('is plain (nothing hidden) when IntersectionObserver is missing', () => {
    const { getByTestId } = render(<InView />);
    expect(getByTestId('box')).toHaveAttribute('data-phase', 'plain');
  });
  it('is plain with reduced motion, even when IntersectionObserver exists', () => {
    globalThis.IntersectionObserver = FakeIO;
    reduceMotion();
    const { getByTestId } = render(<InView />);
    expect(getByTestId('box')).toHaveAttribute('data-phase', 'plain');
  });
  it('is armed first, then in once the element is on screen, and stays in', () => {
    globalThis.IntersectionObserver = FakeIO;
    const { getByTestId } = render(<InView />);
    expect(getByTestId('box')).toHaveAttribute('data-phase', 'armed');
    act(() => seen.cb([{ isIntersecting: false }]));
    expect(getByTestId('box')).toHaveAttribute('data-phase', 'armed');
    act(() => seen.cb([{ isIntersecting: true }]));
    expect(getByTestId('box')).toHaveAttribute('data-phase', 'in');
  });
});

describe('useScrollDive', () => {
  it('does nothing without IntersectionObserver', () => {
    const { getByTestId } = render(<Dive />);
    expect(getByTestId('hero')).not.toHaveAttribute('data-dive');
  });
  it('does nothing with reduced motion', () => {
    globalThis.IntersectionObserver = FakeIO;
    reduceMotion();
    const { getByTestId } = render(<Dive />);
    expect(getByTestId('hero')).not.toHaveAttribute('data-dive');
  });
  it('starts tracking when the element is on screen and cleans up when it unmounts', () => {
    globalThis.IntersectionObserver = FakeIO;
    const { getByTestId, unmount } = render(<Dive />);
    const el = getByTestId('hero');
    expect(el).not.toHaveAttribute('data-dive');
    act(() => seen.cb([{ isIntersecting: true }]));
    expect(el).toHaveAttribute('data-dive');
    unmount();
    expect(el).not.toHaveAttribute('data-dive');
  });
});
