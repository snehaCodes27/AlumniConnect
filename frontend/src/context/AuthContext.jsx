import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch current user from /auth/me
  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setUser(null);
      return null;
    }

    try {
      const response = await api.get('/auth/me');
      if (response.data?.success) {
        setUser(response.data.data);
        return response.data.data;
      } else {
        logout();
        return null;
      }
    } catch (err) {
      console.error('Failed to fetch authenticated user:', err);
      // Only logout on 401 Unauthorized
      if (err.response?.status === 401) {
        logout();
      }
      return null;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      setToken(storedToken);
      await refreshUser();
      setLoading(false);
    };

    initAuth();
  }, [refreshUser]);

  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data?.success) {
        const { token: authToken, user: userData } = response.data.data;
        localStorage.setItem('token', authToken);
        setToken(authToken);
        setUser(userData);
        return { success: true, user: userData };
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed.';
      setError(message);
      return { success: false, message };
    }
  };

  const registerStudent = async (formData) => {
    setError(null);
    try {
      const response = await api.post('/auth/register/student', formData);
      if (response.data?.success) {
        return { success: true, message: response.data.message };
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Registration failed.';
      setError(message);
      return { success: false, message };
    }
  };

  const registerAlumni = async (formData) => {
    setError(null);
    try {
      const response = await api.post('/auth/register/alumni', formData);
      if (response.data?.success) {
        return { success: true, message: response.data.message };
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Registration failed.';
      setError(message);
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout').catch(() => {});
      }
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setError(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        loading,
        error,
        setError,
        login,
        registerStudent,
        registerAlumni,
        logout,
        updateUser,
        refreshUser,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
