import { vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSpots } from './useSpots';
import * as svc from '../services/spotService';

vi.mock('../services/spotService');

const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

describe('useSpots', () => {
  it('loads spots and pagination', async () => {
    svc.listSpots.mockResolvedValue({ data: [{ _id: '1' }], pagination: { page: 1, pages: 1, total: 1, limit: 12 } });
    const { result } = renderHook(() => useSpots({ page: 1 }));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.spots).toHaveLength(1);
    expect(result.current.pagination.total).toBe(1);
  });

  it('aborts the previous request and ignores a late older response', async () => {
    const first = deferred();
    const second = deferred();
    const signals = [];
    svc.listSpots.mockImplementation((_q, signal) => { signals.push(signal); return signals.length === 1 ? first.promise : second.promise; });
    const { result, rerender } = renderHook(({ q }) => useSpots(q), { initialProps: { q: { search: 'a' } } });
    rerender({ q: { search: 'ab' } });
    expect(signals[0].aborted).toBe(true);
    await act(async () => { second.resolve({ data: [{ _id: 'new' }], pagination: { page: 1, pages: 1, total: 1, limit: 12 } }); });
    await act(async () => { first.resolve({ data: [{ _id: 'old' }], pagination: { page: 1, pages: 1, total: 1, limit: 12 } }); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.spots[0]._id).toBe('new');
  });

  it('sets error and retry calls again', async () => {
    svc.listSpots.mockReset();
    svc.listSpots.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ data: [], pagination: { page: 1, pages: 0, total: 0, limit: 12 } });
    const { result } = renderHook(() => useSpots({}));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(svc.listSpots).toHaveBeenCalledTimes(2);
  });
});
