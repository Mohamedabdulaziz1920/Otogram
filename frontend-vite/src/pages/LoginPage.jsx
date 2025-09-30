import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios'; // سنستخدم axios مباشرة
import './AuthPages.css';

// إعداد axios instance مع baseURL من متغيرات البيئة
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '', // ✨ 1. تم التغيير من username إلى email
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth(); // دالة login الآن ستقبل token و user

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // ✨ 2. إجراء طلب API مباشرة من هنا
      const response = await api.post('/api/auth/login', {
        email: formData.email,
        password: formData.password,
      });

      const { token, user } = response.data;

      // ✨ 3. تمرير البيانات إلى دالة login في الـ context
      login(token, user);

      // ✨ 4. منطق إعادة التوجيه الذكي
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/';
      sessionStorage.removeItem('redirectAfterLogin'); // تنظيف بعد الاستخدام
      navigate(redirectPath);

    } catch (err) {
      const errorMessage = err.response?.data?.error || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>تسجيل الدخول إلى Otogram</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">البريد الإلكتروني</label> {/* ✨ تم التغيير */}
            <input
              type="email"
              id="email"
              name="email" // ✨ تم التغيير
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="أدخل بريدك الإلكتروني"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">كلمة المرور</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="أدخل كلمة المرور"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <p className="auth-link">
          ليس لديك حساب؟ <Link to="/register">أنشئ حسابًا جديدًا</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
