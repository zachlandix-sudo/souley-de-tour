import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSpot } from './useSpot';
import * as svc from '../services/spotService';

vi.mock('../services/spotService');

describe('useSpot', () => {
  it('404 gives notFound and no error', async () => {
    svc.getSpot.mockRejectedValue({ response: { status: 404 } });
    const { result } = renderHook(() => useSpot('nope'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notFound).toBe(true);
    expect(result.current.error).toBeNull();
  });
  it('network error gives error, not notFound', async () => {
    svc.getSpot.mockRejectedValue(new Error('Network Error'));
    const { result } = renderHook(() => useSpot('x'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.notFound).toBe(false);
  });
  it('malformed slug (URIError) is not found, not a crash', async () => {
    svc.getSpot.mockRejectedValue(new URIError('bad'));
    const { result } = renderHook(() => useSpot('%E0%A4%A'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notFound).toBe(true);
  });
});
