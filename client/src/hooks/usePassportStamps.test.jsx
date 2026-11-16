import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { STORAGE_KEY } from '../utils/passport';

const account = vi.hoisted(() => ({ listStamps: vi.fn(), mergeStamps: vi.fn(), addStamp: vi.fn(), removeStamp: vi.fn() }));
vi.mock('../services/passportService', () => account);
let auth;
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));

import { usePassportStamps } from './usePassportStamps';

const SPOT = { _id: 'a', name: 'Alpha Falls', slug: 'alpha', municipality: 'Maasin City' };
const SPOT_B = { _id: 'b', name: 'Beta Cave', slug: 'beta', municipality: 'Maasin City' };
const SERVER = [{ spot: 'c', at: '2026-10-01T00:00:00.000Z', method: 'gps', name: 'Gamma Beach', municipality: 'Sogod', slug: 'gamma' }];
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
const savedOrEmpty = () => saved() || {}; // an empty browser copy may exist (written before the account sync took over); what matters is that no stamps are in it
const netErr = () => Object.assign(new Error('Network Error'), { response: undefined });
const httpErr = (status) => Object.assign(new Error('nope'), { response: { status } });

describe('usePassportStamps', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.values(account).forEach((f) => f.mockReset());
    auth = { user: null, loading: false };
  });

  it('a guest keeps stamps in the browser and never calls the account', async () => {
    const { result } = renderHook(() => usePassportStamps());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.sync).toBe('local');
    await act(async () => { await result.current.add(SPOT, 'manual'); });
    expect(Object.keys(result.current.stamps)).toEqual(['a']);
    expect(Object.keys(saved())).toEqual(['a']);
    await act(async () => { await result.current.remove('a'); });
    expect(saved()).toEqual({});
    expect(account.addStamp).not.toHaveBeenCalled();
    expect(account.listStamps).not.toHaveBeenCalled();
  });

  it('is not ready while the login check is still running', () => {
    auth = { user: null, loading: true };
    const { result } = renderHook(() => usePassportStamps());
    expect(result.current.ready).toBe(false);
    expect(account.listStamps).not.toHaveBeenCalled();
  });

  it('a signed-in visitor loads the stamps from the account', async () => {
    auth = { user: { _id: 'u1' }, loading: false };
    account.listStamps.mockResolvedValue(SERVER);
    const { result } = renderHook(() => usePassportStamps());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.sync).toBe('synced');
    expect(Object.keys(result.current.stamps)).toEqual(['c']);
    expect(account.mergeStamps).not.toHaveBeenCalled();
    expect(savedOrEmpty()).toEqual({}); // the account's stamps are not copied into the browser
  });

  it('stamps collected as a guest move up to the account after login, then the browser copy is cleared', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: { at: '2026-11-01T00:00:00.000Z', method: 'manual', name: 'Alpha Falls', municipality: 'Maasin City', slug: 'alpha' } }));
    auth = { user: { _id: 'u1' }, loading: false };
    account.mergeStamps.mockResolvedValue([...SERVER, { spot: 'a', at: '2026-11-01T00:00:00.000Z', method: 'manual', name: 'Alpha Falls', municipality: 'Maasin City', slug: 'alpha' }]);
    const { result } = renderHook(() => usePassportStamps());
    await waitFor(() => expect(result.current.sync).toBe('synced'));
    expect(account.mergeStamps).toHaveBeenCalledWith([{ spot: 'a', at: '2026-11-01T00:00:00.000Z', method: 'manual' }]);
    expect(Object.keys(result.current.stamps).sort()).toEqual(['a', 'c']);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('a new stamp is sent to the account; if the account refuses it the stamp is taken back', async () => {
    auth = { user: { _id: 'u1' }, loading: false };
    account.listStamps.mockResolvedValue([]);
    account.addStamp.mockResolvedValueOnce(undefined).mockRejectedValueOnce(httpErr(409));
    const { result } = renderHook(() => usePassportStamps());
    await waitFor(() => expect(result.current.ready).toBe(true));
    let ok;
    await act(async () => { ok = await result.current.add(SPOT, 'manual'); });
    expect(ok).toBe(true);
    expect(account.addStamp).toHaveBeenCalledWith('a', expect.objectContaining({ method: 'manual', at: expect.any(String) }));
    expect(Object.keys(result.current.stamps)).toEqual(['a']);
    await act(async () => { ok = await result.current.add(SPOT_B, 'gps'); });
    expect(ok).toBe(false);
    expect(Object.keys(result.current.stamps)).toEqual(['a']);
    expect(savedOrEmpty()).toEqual({});
  });

  it('with no signal a new stamp stays on the page and waits in the browser to be uploaded', async () => {
    auth = { user: { _id: 'u1' }, loading: false };
    account.listStamps.mockResolvedValue([]);
    account.addStamp.mockRejectedValue(netErr());
    const { result } = renderHook(() => usePassportStamps());
    await waitFor(() => expect(result.current.ready).toBe(true));
    let ok;
    await act(async () => { ok = await result.current.add(SPOT, 'gps'); });
    expect(ok).toBe(true);
    expect(Object.keys(result.current.stamps)).toEqual(['a']);
    expect(Object.keys(saved())).toEqual(['a']);
    expect(result.current.sync).toBe('error');

    // back online: the sync runs again and uploads the waiting stamp
    account.mergeStamps.mockResolvedValue([{ spot: 'a', at: saved().a.at, method: 'gps', name: 'Alpha Falls', municipality: 'Maasin City', slug: 'alpha' }]);
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(result.current.sync).toBe('synced'));
    expect(account.mergeStamps).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('removing a stamp calls the account and puts the stamp back if that fails', async () => {
    auth = { user: { _id: 'u1' }, loading: false };
    account.listStamps.mockResolvedValue(SERVER);
    account.removeStamp.mockRejectedValueOnce(httpErr(500)).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => usePassportStamps());
    await waitFor(() => expect(result.current.ready).toBe(true));
    let ok;
    await act(async () => { ok = await result.current.remove('c'); });
    expect(ok).toBe(false);
    expect(Object.keys(result.current.stamps)).toEqual(['c']);
    await act(async () => { ok = await result.current.remove('c'); });
    expect(ok).toBe(true);
    expect(result.current.stamps).toEqual({});
  });

  it('if the account cannot be reached at first, the visitor keeps working with this device and can retry', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: { at: '2026-11-01T00:00:00.000Z', method: 'gps', name: 'Alpha Falls', municipality: 'Maasin City', slug: 'alpha' } }));
    auth = { user: { _id: 'u1' }, loading: false };
    account.mergeStamps.mockRejectedValueOnce(netErr());
    const { result } = renderHook(() => usePassportStamps());
    await waitFor(() => expect(result.current.sync).toBe('error'));
    expect(result.current.ready).toBe(true);
    expect(Object.keys(result.current.stamps)).toEqual(['a']);
    expect(Object.keys(saved())).toEqual(['a']); // still safe in the browser

    account.mergeStamps.mockResolvedValueOnce([{ spot: 'a', at: '2026-11-01T00:00:00.000Z', method: 'gps', name: 'Alpha Falls', municipality: 'Maasin City', slug: 'alpha' }]);
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.sync).toBe('synced'));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('after logout the account stamps are gone from the page and were never written to the browser', async () => {
    auth = { user: { _id: 'u1' }, loading: false };
    account.listStamps.mockResolvedValue(SERVER);
    const { result, rerender } = renderHook(() => usePassportStamps());
    await waitFor(() => expect(result.current.sync).toBe('synced'));
    auth = { user: null, loading: false };
    rerender();
    await waitFor(() => expect(result.current.sync).toBe('local'));
    expect(result.current.stamps).toEqual({});
    expect(saved()).toEqual({});
  });
});
