import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TiltCard from './TiltCard';

const realMatchMedia = window.matchMedia;
// fine = a mouse is the main pointer; reduce = the visitor asked for less motion.
const media = (fine, reduce) => {
  window.matchMedia = (q) => ({ matches: q.includes('prefers-reduced-motion') ? reduce : fine, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
};
afterEach(() => { window.matchMedia = realMatchMedia; });

const box = (el) => { el.getBoundingClientRect = () => ({ left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100 }); };

describe('TiltCard', () => {
  it('shows its children', () => {
    media(true, false);
    render(<TiltCard className="x"><p>inside</p></TiltCard>);
    expect(screen.getByText('inside').parentElement).toHaveClass('x');
  });

  it('leans toward the pointer: top right corner tips the card up and to the right, and the light moves there', async () => {
    media(true, false);
    render(<TiltCard className="x"><p>inside</p></TiltCard>);
    const el = screen.getByText('inside').parentElement;
    box(el);
    fireEvent.pointerMove(el, { clientX: 200, clientY: 0, pointerType: 'mouse' });
    await waitFor(() => expect(parseFloat(el.style.getPropertyValue('--ry'))).toBeGreaterThan(0));
    expect(parseFloat(el.style.getPropertyValue('--rx'))).toBeGreaterThan(0);
    expect(parseFloat(el.style.getPropertyValue('--gx'))).toBeGreaterThan(50);
    expect(parseFloat(el.style.getPropertyValue('--gy'))).toBeLessThan(50);
    expect(parseFloat(el.style.getPropertyValue('--gl'))).toBeGreaterThan(0);
  });

  it('stays flat for a finger (touch) and for reduced motion', async () => {
    media(true, false);
    const a = render(<TiltCard><p>touch</p></TiltCard>);
    const t = screen.getByText('touch').parentElement; box(t);
    fireEvent.pointerMove(t, { clientX: 200, clientY: 0, pointerType: 'touch' });
    await new Promise((r) => setTimeout(r, 60));
    expect(t.style.getPropertyValue('--ry')).toBe('');
    a.unmount();

    media(true, true);
    render(<TiltCard><p>calm</p></TiltCard>);
    const c = screen.getByText('calm').parentElement; box(c);
    fireEvent.pointerMove(c, { clientX: 200, clientY: 0, pointerType: 'mouse' });
    await new Promise((r) => setTimeout(r, 60));
    expect(c.style.getPropertyValue('--ry')).toBe('');
  });
});
