import { render, screen } from '@testing-library/react';
import CountUp from './CountUp';
import StatusPill from './StatusPill';
import AdminHeader from './AdminHeader';
import Avatar from './Avatar';

describe('admin parts', () => {
  it('CountUp shows the final number at once where it cannot animate (jsdom has no IntersectionObserver)', () => {
    render(<p data-testid="n"><CountUp value={41} /></p>);
    expect(screen.getByTestId('n')).toHaveTextContent('41');
  });
  it('CountUp treats a missing value as 0', () => {
    render(<p data-testid="n"><CountUp /></p>);
    expect(screen.getByTestId('n')).toHaveTextContent('0');
  });
  it('StatusPill shows the status word, or a custom label, with a tone class', () => {
    const { rerender, container } = render(<StatusPill status="published" />);
    expect(screen.getByText('published')).toBeInTheDocument();
    expect(container.querySelector('.adm-pill-ok')).not.toBeNull();
    rerender(<StatusPill status="archived" label="Inactive" />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(container.querySelector('.adm-pill-idle')).not.toBeNull();
  });
  it('AdminHeader has one h1 and puts the actions beside it', () => {
    render(<AdminHeader eyebrow="Content" title="Spots" subtitle="Hi"><button type="button">Add</button></AdminHeader>);
    expect(screen.getByRole('heading', { level: 1, name: 'Spots' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
  it('Avatar shows up to two initials and is hidden from screen readers', () => {
    const { container } = render(<Avatar name="jonas reyes santos" />);
    expect(container.firstChild).toHaveTextContent('JR');
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
