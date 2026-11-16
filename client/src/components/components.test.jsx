import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';
import Rating from './Rating';
import SpotRow from './SpotRow';
import Pagination from './Pagination';

describe('shared components', () => {
  it('ErrorState retry', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });
  it('EmptyState action', async () => {
    const onAction = vi.fn();
    render(<EmptyState title="Nothing" actionLabel="Clear filters" onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onAction).toHaveBeenCalled();
  });
  it('Rating', () => {
    const { rerender } = render(<Rating value={0} count={0} />);
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
    rerender(<Rating value={4.5} count={2} />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });
  it('SpotRow link and hover', async () => {
    const onHover = vi.fn();
    const spot = { _id: 'id', slug: 'limasawa-island', name: 'Limasawa Island', municipality: 'Limasawa' };
    render(<MemoryRouter><SpotRow spot={spot} onHover={onHover} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Limasawa Island' })).toHaveAttribute('href', '/spots/limasawa-island');
    await userEvent.hover(screen.getByRole('article'));
    expect(onHover).toHaveBeenCalledWith('id');
    await userEvent.unhover(screen.getByRole('article'));
    expect(onHover).toHaveBeenLastCalledWith(null);
  });
  it('Pagination', async () => {
    const onChange = vi.fn();
    const { container, rerender } = render(<Pagination page={1} pages={3} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenCalledWith(2);
    rerender(<Pagination page={1} pages={1} onChange={onChange} />);
    expect(container).toBeEmptyDOMElement();
  });
});
