import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// إعداد axios instance مع baseURL من متغيرات البيئة
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // للتحقق من المستخدم عند تحميل التطبيق

  // ✨ 1. تبسيط دالة login
  // وظيفتها الآن هي فقط تحديث الحالة وحفظ التوكن
  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  // ✨ 2. تبسيط دالة register (التي أصبحت غير ضرورية هنا، لكن يمكن تركها)
  // بعد التسجيل الناجح، ستقوم صفحة التسجيل باستدعاء دالة login
  const register = (token, userData) => {
    login(token, userData); // ببساطة تستدعي login
  };
  
  // ✨ 3. تبسيط دالة logout
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // ✨ 4. useEffect للتحقق من وجود توكن عند أول تحميل للتطبيق
  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // إعداد الهيدر للطلبات المستقبلية
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // مسار جديد في السيرفر للتحقق من التوكن وإعادة بيانات المستخدم
          const response = await api.get('/api/auth/me'); 
          setUser(response.data.user);
        } catch (error) {
          console.error('Token verification failed:', error);
          logout(); // حذف التوكن غير الصالح
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    // لم نعد بحاجة لتصدير register لأن مكون التسجيل سيستخدم login
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
