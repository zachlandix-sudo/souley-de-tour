import { vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PhotoReveal, { revealDelay } from './PhotoReveal';
import SpotCard from './SpotCard';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('PhotoReveal', () => {
  it('just shows the photo where IntersectionObserver is missing, as in jsdom', () => {
    const { container, getByText } = render(<PhotoReveal seed="a"><p>photo</p></PhotoReveal>);
    expect(getByText('photo')).toBeInTheDocument();
    expect(container.querySelector('.pr')).toHaveAttribute('data-pr', 'done');
    expect(container.querySelector('.pr-edge')).toBeNull();
  });

  it('just shows the photo with reduced motion', () => {
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { container } = render(<PhotoReveal seed="a"><p>photo</p></PhotoReveal>);
    expect(container.querySelector('.pr')).toHaveAttribute('data-pr', 'done');
  });

  it('waits hidden, plays when the card comes into view, and cleans up when the glint ends', () => {
    vi.useFakeTimers();
    let seen;
    vi.stubGlobal('IntersectionObserver', class { constructor(cb) { seen = cb; } observe() {} disconnect() {} });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const { container } = render(<PhotoReveal seed="a"><p>photo</p></PhotoReveal>);
    const root = container.querySelector('.pr');
    expect(root).toHaveAttribute('data-pr', 'wait');
    expect(container.querySelector('.pr-edge')).not.toBeNull();

    act(() => seen([{ isIntersecting: false }]));
    expect(root).toHaveAttribute('data-pr', 'wait');

    act(() => seen([{ isIntersecting: true }]));
    act(() => { vi.advanceTimersByTime(revealDelay('a') + 1); });
    expect(root).toHaveAttribute('data-pr', 'play');

    fireEvent.animationEnd(container.querySelector('.pr-glint'));
    expect(root).toHaveAttribute('data-pr', 'done');
    expect(container.querySelector('.pr-edge')).toBeNull();
    expect(container.querySelector('p')).toHaveTextContent('photo');
  });

  it('start delay is small and repeatable', () => {
    expect(revealDelay('sogod-bay')).toBe(revealDelay('sogod-bay'));
    for (const s of ['a', 'b', 'Lum-an Falls', '']) { expect(revealDelay(s)).toBeGreaterThanOrEqual(0); expect(revealDelay(s)).toBeLessThan(320); }
  });

  it('never blocks the spot card link', () => {
    const { container } = render(<MemoryRouter><SpotCard spot={{ _id: '1', slug: 'a', name: 'A', municipality: 'Maasin City' }} /></MemoryRouter>);
    expect(container.querySelector('a')).toHaveAttribute('href', '/spots/a');
  });
});
