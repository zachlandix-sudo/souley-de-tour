import { vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HorizonHero from './HorizonHero';

describe('HorizonHero', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0)); // noon
    vi.stubGlobal('matchMedia', () => ({ matches: true })); // glide() jumps straight to the hour
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('is one section: the headline, the lead, the Start link and the time controls together', () => {
    const { container } = render(<HorizonHero />);
    expect(container.querySelectorAll('section')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Discover the sacred coasts of Southern Leyte' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start experience/ })).toHaveAttribute('href', '#journey');
    expect(screen.getByRole('slider', { name: 'Slide between day and night' })).toBeInTheDocument();
  });

  it('opens at the visitor\'s own time of day', () => {
    render(<HorizonHero />);
    expect(screen.getByRole('slider')).toHaveValue('12');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '12:00');
  });

  it('follows the slider: the scene is dark with stars at night', () => {
    const { container } = render(<HorizonHero />);
    const stars = () => container.querySelector('svg circle').closest('svg');
    expect(stars().style.opacity).toBe('0');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '2' } });
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '02:00');
    expect(stars().style.opacity).toBe('1');
  });

  it('jumps to a preset time', async () => {
    render(<HorizonHero />);
    await userEvent.click(screen.getByRole('button', { name: '22:00' }));
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '22:00');
  });

  it('hides the scene from assistive tech but keeps the controls reachable', () => {
    const { container } = render(<HorizonHero />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });
});
