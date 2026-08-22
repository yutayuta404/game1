import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import type { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { user } = await api.getMe();
      setUser(user);
    } catch (err) {
      api.setToken(null);
      setError('Session expired');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (username: string) => {
    setError(null);
    setLoading(true);
    try {
      const { user } = await api.login(username);
      setUser(user);
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  const updateBalance = (newBalance: number) => {
    setUser((prev: User | null) => prev ? { ...prev, balance: newBalance } : null);
  };

  return { user, loading, error, login, logout, updateBalance, refresh: loadUser };
}