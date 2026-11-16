import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as authService from '../services/authService';
import * as passportService from '../services/passportService';
import { setUnauthorizedHandler } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const userRef = useRef(null);
  userRef.current = user;

  useEffect(() => {
    let live = true;
    authService.me()
      .then((u) => live && setUser(u))
      .catch(() => live && setUser(null))
      .finally(() => live && setLoading(false));
    // A 401 mid-session logs out once. If nobody is logged in there is nothing to clear.
    setUnauthorizedHandler(() => {
      if (!userRef.current) return;
      setUser(null);
      setSessionExpired(true);
    });
    return () => { live = false; setUnauthorizedHandler(null); };
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await authService.login(email, password);
    setSessionExpired(false);
    setUser(u);
    return u;
  }, []);
  const register = useCallback(async (values) => {
    const u = await authService.register(values);
    setSessionExpired(false);
    setUser(u);
    return u;
  }, []);
  const logout = useCallback(async () => {
    try { await authService.logout(); } finally { setUser(null); setSessionExpired(false); }
  }, []);

  // Change password keeps this device signed in (the server issues a fresh cookie) and ends all others.
  const changePassword = useCallback(async (values) => {
    const u = await authService.changePassword(values);
    setUser(u);
    return u;
  }, []);
  const logoutAll = useCallback(async () => {
    try { await authService.logoutAll(); } finally { setUser(null); setSessionExpired(false); }
  }, []);

  // The Passport's holder page: home town and cover colour live on the account.
  const updatePassport = useCallback(async (values) => {
    const profile = await passportService.saveProfile(values);
    setUser((u) => (u ? { ...u, passport: profile } : u));
    return profile;
  }, []);

  const value = useMemo(
    () => ({ user, loading, sessionExpired, login, register, logout, changePassword, logoutAll, updatePassport }),
    [user, loading, sessionExpired, login, register, logout, changePassword, logoutAll, updatePassport]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
