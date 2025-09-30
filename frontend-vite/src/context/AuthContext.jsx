import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// --- إعدادات أولية ---
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

// --- المكون الرئيسي للمزود (Provider) ---
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- دوال التحكم في المصادقة ---

  // دالة لتسجيل الدخول وتحديث الحالة
  const login = (token, userData) => {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  // دالة لتسجيل الخروج وتنظيف الحالة
  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization']; // ✨ تحسين: حذف الهيدر
    setUser(null);
  };

  // --- التأثير الجانبي (Effect) لاستعادة الجلسة ---

  // هذا التأثير يعمل مرة واحدة فقط عند تحميل التطبيق
  // للتحقق مما إذا كان هناك جلسة تسجيل دخول صالحة
  useEffect(() => {
    const verifyUserSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get('/api/auth/me');
          setUser(response.data.user); // استعادة بيانات المستخدم
        } catch (error) {
          console.error('Session token is invalid or expired. Logging out.');
          logout(); // حذف التوكن غير الصالح
        }
      }
      setLoading(false); // تم الانتهاء من التحقق
    };

    verifyUserSession();
  }, []); // مصفوفة فارغة تعني أنه يعمل مرة واحدة فقط

  // --- القيمة التي سيتم توفيرها لبقية التطبيق ---
  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user, // خاصية مساعدة لمعرفة ما إذا كان المستخدم مسجلاً
  };

  return (
    <AuthContext.Provider value={value}>
      {/* عرض التطبيق فقط بعد التأكد من حالة المستخدم */}
      {!loading && children}
    </AuthContext.Provider>
  );
};
