import { render, fireEvent } from '@testing-library/react';
import JourneyPhoto from './JourneyPhoto';

describe('JourneyPhoto', () => {
  it('tries the next address when one fails, then draws the fallback picture', () => {
    const { container } = render(<JourneyPhoto sources={['/a.jpg', '/b.jpg']} label="Plan" />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/a.jpg');
    fireEvent.error(container.querySelector('img'));
    expect(container.querySelector('img')).toHaveAttribute('src', '/b.jpg');
    fireEvent.error(container.querySelector('img'));
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg.jr-art')).not.toBeNull();
  });

  it('fades the photo in only after it has loaded', () => {
    const { container } = render(<JourneyPhoto sources={['/a.jpg']} />);
    const img = container.querySelector('img');
    expect(img).not.toHaveClass('is-ready');
    fireEvent.load(img);
    expect(img).toHaveClass('is-ready');
  });

  it('shows the picture straight away when there are no addresses', () => {
    const { container } = render(<JourneyPhoto sources={[]} label="Pack" />);
    expect(container.querySelector('svg.jr-art')).not.toBeNull();
  });
});
