import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// --- إعدادات أولية ---
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// إنشاء axios instance لاستخدامه في جميع أنحاء التطبيق
// هذا يضمن أن جميع الطلبات تذهب إلى السيرفر الصحيح
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

// --- المكون الرئيسي للمزود (Provider) ---
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- دوال التحكم في المصادقة ---

  // دالة بسيطة لتحديث الحالة بعد تسجيل الدخول أو التسجيل
  const login = (token, userData) => {
    localStorage.setItem('token', token);
    // إعداد الهيدر لجميع الطلبات المستقبلية التي تستخدم 'api' instance
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  // دالة لتسجيل الخروج وتنظيف الحالة
  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // --- التأثير الجانبي (Effect) لاستعادة الجلسة ---
  // يعمل مرة واحدة فقط عند تحميل التطبيق للتحقق من وجود جلسة صالحة
  useEffect(() => {
    const verifyUserSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get('/api/auth/me');
          // استعادة بيانات المستخدم إذا كان التوكن صالحًا
          setUser(response.data.user);
        } catch (error) {
          console.error('Session token is invalid or expired. Logging out.');
          logout(); // حذف التوكن غير الصالح
        }
      }
      setLoading(false); // تم الانتهاء من التحقق في كلتا الحالتين
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
      {/* لا تعرض التطبيق إلا بعد التأكد من حالة المستخدم */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ✨ تصدير api instance للسماح للمكونات الأخرى باستخدامه
export { api };
