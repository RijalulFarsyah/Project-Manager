import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { me, login as apiLogin, logout as apiLogout } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await me();
      setUser(data);
    } catch (err) {
      setUser(null);
      // Apabila tidak login, tidak dianggap error; status tetap null
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const doLogin = useCallback(async (username, password) => {
    setError(null);
    const data = await apiLogin(username, password);
    setUser(data);
    return data;
  }, []);

  const doLogout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setError(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login: doLogin,
        logout: doLogout,
        isAuthenticated: !!user,
        refetchSession: checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus di dalam AuthProvider');
  return ctx;
}
