import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SESSION_EXPIRED_EVENT, api, tokenStorage } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (tokenStorage.get() ? 'checking' : 'anonymous'));

  // Ao abrir o app com token salvo, confirma no backend se ainda é válido
  useEffect(() => {
    if (status !== 'checking') return;
    api.me()
      .then(({ user: me }) => { setUser(me); setStatus('authenticated'); })
      .catch(() => { tokenStorage.clear(); setStatus('anonymous'); });
  }, [status]);

  const logout = useCallback((message) => {
    tokenStorage.clear();
    setUser(null);
    setStatus('anonymous');
    if (message) toast.info(message);
  }, []);

  useEffect(() => {
    const onExpired = () => logout('Sua sessão expirou. Entre novamente.');
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [logout]);

  const login = useCallback(async (credentials) => {
    const { token, user: logged } = await api.login(credentials);
    tokenStorage.set(token);
    setUser(logged);
    setStatus('authenticated');
    return logged;
  }, []);

  const can = useCallback((permission) => user?.permissions?.includes(permission) ?? false, [user]);

  const value = useMemo(() => ({ user, status, login, logout, can }), [user, status, login, logout, can]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return context;
}
