import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, getToken } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((d) => setPlayer(d.player))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const d = await api.post('/auth/login', { email, password });
    setToken(d.token);
    setPlayer(d.player);
    return d.player;
  }

  async function register(name, email, password) {
    const d = await api.post('/auth/register', { name, email, password });
    setToken(d.token);
    setPlayer(d.player);
    return d.player;
  }

  function logout() {
    setToken(null);
    setPlayer(null);
  }

  const value = {
    player,
    setPlayer,
    loading,
    login,
    register,
    logout,
    isOrganizer: player?.role === 'organizer',
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
