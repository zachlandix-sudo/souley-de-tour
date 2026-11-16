import { vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as authService from '../services/authService';
import { setUnauthorizedHandler } from '../services/api';

vi.mock('../services/authService');
vi.mock('../services/api', () => ({ setUnauthorizedHandler: vi.fn() }));
const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
const admin = { _id: '1', fullName: 'Ana', role: 'admin' };

describe('AuthProvider', () => {
  beforeEach(() => vi.resetAllMocks());

  it('loads the user from me()', async () => {
    authService.me.mockResolvedValue(admin);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(admin);
  });
  it('me() null means logged out, no error', async () => {
    authService.me.mockResolvedValue(null);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });
  it('login sets user; rejection leaves null and rethrows', async () => {
    authService.me.mockResolvedValue(null);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    authService.login.mockRejectedValueOnce(new Error('bad'));
    await act(async () => { await expect(result.current.login('a', 'b')).rejects.toThrow('bad'); });
    expect(result.current.user).toBeNull();
    authService.login.mockResolvedValueOnce(admin);
    await act(async () => { await result.current.login('a', 'b'); });
    expect(result.current.user).toEqual(admin);
  });
  it('logout clears user', async () => {
    authService.me.mockResolvedValue(admin);
    authService.logout.mockResolvedValue();
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(admin));
    await act(async () => { await result.current.logout(); });
    expect(result.current.user).toBeNull();
  });
  it('a 401 mid-session clears the user and flags expiry', async () => {
    authService.me.mockResolvedValue(admin);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(admin));
    const handler = setUnauthorizedHandler.mock.calls.at(-1)[0];
    act(() => handler());
    expect(result.current.user).toBeNull();
    expect(result.current.sessionExpired).toBe(true);
  });
});
