import { render } from '@testing-library/react';
import ScrollMarquee from './ScrollMarquee';

const TOWNS = ['Maasin City', 'Sogod', 'Limasawa'];

describe('ScrollMarquee', () => {
  it('is decorative: hidden from screen readers, and renders without IntersectionObserver (jsdom)', () => {
    const { container } = render(<ScrollMarquee items={TOWNS} />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
  it('shows every town twice (for the endless loop), numbered', () => {
    const { container } = render(<ScrollMarquee items={TOWNS} />);
    expect(container.querySelectorAll('[data-town]')).toHaveLength(6);
    expect([...container.querySelectorAll('sup')].slice(0, 3).map((n) => n.textContent)).toEqual(['01', '02', '03']);
  });
  it('every name has a self-drawing line and diamond, each 100 ms after the one before', () => {
    const { container } = render(<ScrollMarquee items={TOWNS} />);
    const lines = [...container.querySelectorAll('.marquee-line path')].slice(0, 3).map((p) => p.style.getPropertyValue('--d'));
    expect(lines).toEqual(['0ms', '100ms', '200ms']);
    expect(container.querySelectorAll('.marquee-gem path')).toHaveLength(6);
    expect(container.querySelector('.marquee-line path')).toHaveAttribute('pathLength', '1');
  });
});

describe('ScrollMarquee motion', () => {
  it('splits each name into letters for the hop (spaces kept) and keeps the band visible without IntersectionObserver', () => {
    const { container } = render(<ScrollMarquee items={['Maasin City']} />);
    const letters = [...container.querySelector('.marquee-name').querySelectorAll('.mq-ch')];
    expect(letters).toHaveLength(11);
    expect(letters.map((l) => l.textContent).join('').replace(/ /g, ' ')).toBe('Maasin City');
    expect(letters[3].style.getPropertyValue('--k')).toBe('3');
    expect(container.querySelector('.mq-band')).not.toHaveClass('mq-prep'); // jsdom has no IntersectionObserver, so the band stays shown
    expect(container.querySelector('.mq-sweep')).toBeInTheDocument();
  });
});
