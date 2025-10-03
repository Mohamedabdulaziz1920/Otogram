import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// إنشاء axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true حتى يتم التحقق من الجلسة

  // تسجيل الدخول
  const login = (token, userData) => {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  // تسجيل الخروج
  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // التحقق من الجلسة عند تحميل التطبيق
  useEffect(() => {
    const verifyUserSession = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const response = await api.get('/api/auth/me');
          if (response.data && response.data.user) {
            setUser(response.data.user);
          } else {
            logout();
          }
        } catch (error) {
          console.error('Session token invalid or expired. Logging out.');
          logout();
        }
      } else {
        logout();
      }
      setLoading(false);
    };

    verifyUserSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export { api };
