import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAllSpots } from './useAllSpots';
import { listSpots } from '../services/spotService';

vi.mock('../services/spotService');

describe('useAllSpots', () => {
  beforeEach(() => vi.clearAllMocks());

  it('walks every page and joins the results', async () => {
    listSpots
      .mockResolvedValueOnce({ data: [{ _id: 'a' }], pagination: { page: 1, pages: 2 } })
      .mockResolvedValueOnce({ data: [{ _id: 'b' }], pagination: { page: 2, pages: 2 } });
    const { result } = renderHook(() => useAllSpots({ sort: 'name' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.spots.map((s) => s._id)).toEqual(['a', 'b']);
    expect(listSpots).toHaveBeenNthCalledWith(1, { sort: 'name', limit: 50, page: 1 }, expect.anything());
    expect(listSpots).toHaveBeenNthCalledWith(2, { sort: 'name', limit: 50, page: 2 }, expect.anything());
  });

  it('reports an error', async () => {
    listSpots.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useAllSpots());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});
