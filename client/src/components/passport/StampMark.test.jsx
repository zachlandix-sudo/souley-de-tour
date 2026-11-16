import { render } from '@testing-library/react';
import StampMark from './StampMark';
import { STAMP_SHAPES } from '../../utils/passport';

describe('StampMark', () => {
  it.each(STAMP_SHAPES)('draws a %s stamp with the town, day, month and year', (shape) => {
    const { container } = render(<StampMark shape={shape} town="Maasin City" day="12" mon="Nov" year="2026" method="gps" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    const text = svg.textContent;
    expect(text).toContain('MAASIN CITY');
    expect(text).toContain('12');
    expect(text).toContain('NOV');
    expect(text).toContain('2026');
    expect(text).toContain('GPS VERIFIED');
  });

  it('says HAND-MARKED for a manual stamp', () => {
    const { container } = render(<StampMark town="Sogod" day="3" mon="Dec" year="2026" method="manual" />);
    expect(container.textContent).toContain('HAND-MARKED');
  });

  it('the empty ghost outline shows the town but no date', () => {
    const { container } = render(<StampMark ghost town="Sogod" />);
    expect(container.textContent).toContain('SOGOD');
    expect(container.textContent).not.toContain('VERIFIED');
    expect(container.querySelector('filter')).toBeNull();
  });

  it('fills a real stamp with an ink wash so it reads as a solid mark', () => {
    const { container } = render(<StampMark town="Maasin" day="12" mon="Nov" year="2026" />);
    expect(container.querySelector('.sm-wash')).not.toBeNull();
  });

  it('the empty ghost outline has no ink wash', () => {
    const { container } = render(<StampMark ghost shape="octagon" town="Sogod" />);
    expect(container.querySelector('.sm-wash')).toBeNull();
  });

  it('the boxed stamp cuts its label out of the band with a mask (works on any background)', () => {
    const { container } = render(<StampMark shape="rect" town="Silago" day="3" mon="Dec" year="2026" />);
    expect(container.querySelector('mask')).not.toBeNull();
    expect(container.querySelector('.sm-band')).toHaveAttribute('mask');
    expect(container.querySelector('mask').textContent).toContain('GPS VERIFIED');
  });
});
