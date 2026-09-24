import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadAdminDb } from '../services/localStore';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
async function api(path, body) {
  const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

/** Only mounted on /admin, so the public storefront never loads auth code paths. */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api('/api/admin/session').then(async (data) => {
      if (!alive) return;
      setSession(data);
      setIsAdmin(true);
      await loadAdminDb();
    }).catch(() => { if (alive) { setSession(null); setIsAdmin(false); } }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const signIn = useCallback(async (password) => {
    const next = await api('/api/admin/login', { password });
    await loadAdminDb();
    setSession(next);
    setIsAdmin(true);
  }, []);

  const updatePassword = useCallback(async (password) => {
    await api('/api/admin/password', { password });
  }, []);

  const signOut = useCallback(async () => {
    try { await api('/api/admin/logout', {}); } catch { /* clear local view even if offline */ }
    setSession(null);
    setIsAdmin(false);
  }, []);

  const value = useMemo(() => ({ session, isAdmin, loading, signIn, signOut, updatePassword }), [session, isAdmin, loading, signIn, signOut, updatePassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
