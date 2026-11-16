import { vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import CalmTitle from './CalmTitle';

// A fake IntersectionObserver that lets the test decide when the title "scrolls into view".
function fakeObserver() {
  const calls = {};
  vi.stubGlobal('IntersectionObserver', class { constructor(cb) { calls.cb = cb; } observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  return calls;
}

describe('CalmTitle', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is a plain heading where it cannot animate (jsdom has no IntersectionObserver)', () => {
    const { container } = render(<CalmTitle text="Why Southern Leyte" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Why Southern Leyte' })).toBeInTheDocument();
    expect(screen.getByText('Why Southern Leyte')).toBeInTheDocument();
    expect(container.querySelector('.calm-word')).toBeNull();
  });

  it('is a plain heading with "reduce motion"', () => {
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { container } = render(<CalmTitle text="Hello world" />);
    expect(container.querySelector('.calm-word')).toBeNull();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('hides the words until it scrolls into view, then lets them rise; the full text stays readable', () => {
    const calls = fakeObserver();
    const { container } = render(<CalmTitle text="Why Southern Leyte" id="why-title" />);
    const h = screen.getByRole('heading', { name: 'Why Southern Leyte' });
    expect(h).toHaveAttribute('id', 'why-title');
    expect(container.querySelectorAll('.calm-word')).toHaveLength(3);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('Why Southern Leyte');
    expect(h).toHaveClass('is-armed');
    expect(h).not.toHaveClass('is-in');
    act(() => calls.cb([{ isIntersecting: true }]));
    expect(h).toHaveClass('is-in');
  });

  it('draws an orange line unless asked not to, and can centre it', () => {
    fakeObserver();
    const { container, rerender } = render(<CalmTitle text="Hi there" align="center" />);
    expect(container.querySelector('.calm-rule')).not.toBeNull();
    expect(container.querySelector('h2')).toHaveClass('is-center');
    rerender(<CalmTitle text="Hi there" rule={false} />);
    expect(container.querySelector('.calm-rule')).toBeNull();
  });

  it('can be another heading level (the 404 page uses h1)', () => {
    render(<CalmTitle as="h1" text="Lost" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Lost' })).toBeInTheDocument();
  });
});
