// frontend-vite/src/context/AuthContext.jsx
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
  const [loading, setLoading] = useState(true);

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

  // ✅ إضافة دالة updateUser
  const updateUser = (updates) => {
    console.log('🔄 Updating user in context:', updates);
    setUser(prevUser => {
      if (!prevUser) {
        console.warn('⚠️ No user to update');
        return prevUser;
      }
      const updatedUser = { ...prevUser, ...updates };
      console.log('✅ User updated in context:', updatedUser);
      return updatedUser;
    });
  };

  // ✅ إضافة دالة refetchUser لإعادة جلب بيانات المستخدم
  const refetchUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await api.get('/api/auth/me');
      if (response.data && response.data.user) {
        setUser(response.data.user);
        console.log('✅ User refetched:', response.data.user);
        return response.data.user;
      }
    } catch (error) {
      console.error('❌ Error refetching user:', error);
      logout();
    }
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
            console.log('✅ Session verified:', response.data.user);
          } else {
            logout();
          }
        } catch (error) {
          console.error('❌ Session invalid, logging out');
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
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        login, 
        logout, 
        updateUser,      // ✅ تصدير updateUser
        refetchUser,     // ✅ تصدير refetchUser
        isAuthenticated: !!user 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { api };
