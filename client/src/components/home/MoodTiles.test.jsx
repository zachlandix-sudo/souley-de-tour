import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MoodTiles, { MoodPhoto } from './MoodTiles';
import { findPhoto } from '../../services/photoService';

vi.mock('../../services/photoService');

const FOUND = { url: 'https://img.example/falls.jpg', credit: 'Mia', creditUrl: 'https://x', source: 'Unsplash' };

describe('MoodPhoto', () => {
  it('shows nothing when there is neither your file nor a found photo', () => {
    const { container } = render(<MoodPhoto />);
    expect(container.querySelector('img')).toBeNull();
  });
  it('tries your own file first, then the found photo, and credits the photographer only for the found one', () => {
    const { container } = render(<MoodPhoto own="/moods/a.jpg" photo={FOUND} />);
    let img = container.querySelector('img');
    expect(img.getAttribute('src')).toBe('/moods/a.jpg');
    fireEvent.load(img);
    expect(container.querySelector('.mood-credit')).toBeNull(); // your own photo needs no credit line
    fireEvent.error(img);
    img = container.querySelector('img');
    expect(img.getAttribute('src')).toBe(FOUND.url);
    expect(img.className).not.toMatch(/is-ready/);
    fireEvent.load(img);
    expect(img.className).toMatch(/is-ready/);
    expect(container.querySelector('.mood-credit').textContent).toBe('Photo: Mia · Unsplash');
  });
  it('gives up quietly when every address fails', () => {
    const { container } = render(<MoodPhoto own="/moods/a.jpg" photo={FOUND} />);
    fireEvent.error(container.querySelector('img'));
    fireEvent.error(container.querySelector('img'));
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.mood-credit')).toBeNull();
  });
});

describe('MoodTiles photos', () => {
  beforeEach(() => { vi.mocked(findPhoto).mockReset(); });
  it('asks for one photo per card with words that match the card, and puts it inside the card', async () => {
    vi.mocked(findPhoto).mockImplementation((q) => Promise.resolve(q === 'waterfall Philippines' ? FOUND : null));
    const { container } = render(<MemoryRouter><MoodTiles /></MemoryRouter>);
    await waitFor(() => expect(findPhoto).toHaveBeenCalledWith('waterfall Philippines'));
    expect(findPhoto).toHaveBeenCalledTimes(6);
    const link = screen.getByRole('link', { name: /Chase a waterfall/ });
    // your own file is tried first; once it fails the found photo takes its place inside the same card
    await waitFor(() => expect(link.querySelector('img')).not.toBeNull());
    fireEvent.error(link.querySelector('img'));
    await waitFor(() => expect(link.querySelector('img').getAttribute('src')).toBe(FOUND.url));
    expect(container.querySelectorAll('img')).toHaveLength(6); // every card has an image slot (your file's address)
  });
});
