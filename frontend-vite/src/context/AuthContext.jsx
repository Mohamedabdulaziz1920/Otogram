import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// --- إعدادات أولية ---
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// تحديد رابط API بناءً على البيئة
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
});

// --- المكون الرئيسي للمزود (Provider) ---
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- دوال التحكم في المصادقة ---

  // دالة تسجيل الدخول
  const login = async (username, password) => {
    try {
      const response = await api.post('/api/auth/login', { username, password });
      const { token, user: userData } = response.data;
      
      // حفظ التوكن وتحديث الحالة
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'حدث خطأ في تسجيل الدخول' 
      };
    }
  };

  // دالة التسجيل
  const register = async (username, email, password) => {
    try {
      const response = await api.post('/api/auth/register', { 
        username, 
        email, 
        password 
      });
      const { token, user: userData } = response.data;
      
      // حفظ التوكن وتحديث الحالة
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'حدث خطأ في إنشاء الحساب' 
      };
    }
  };

  // دالة لتسجيل الخروج وتنظيف الحالة
  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // دالة لتحديث بيانات المستخدم
  const updateUser = (updatedData) => {
    setUser(prevUser => ({ ...prevUser, ...updatedData }));
  };

  // --- التأثير الجانبي (Effect) لاستعادة الجلسة ---
  useEffect(() => {
    const verifyUserSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get('/api/auth/me');
          setUser(response.data.user || response.data); // دعم كلا التنسيقين
        } catch (error) {
          console.error('Session verification failed:', error);
          logout(); // حذف التوكن غير الصالح
        }
      }
      setLoading(false);
    };

    verifyUserSession();
  }, []);

  // --- القيمة التي سيتم توفيرها لبقية التطبيق ---
  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    api, // توفير instance من axios للاستخدام في باقي التطبيق
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// تصدير api instance للاستخدام في ملفات أخرى
export { api };
