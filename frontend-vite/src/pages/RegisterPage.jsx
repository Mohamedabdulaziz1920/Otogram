import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios'; // سنستخدم axios مباشرة هنا
import './AuthPages.css';

// إعداد axios instance مع baseURL من متغيرات البيئة
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth(); // سنستخدم دالة login لتحديث الـ context بعد التسجيل

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // التحقق من تطابق كلمات المرور
    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    setLoading(true);

    try {
      // إرسال طلب التسجيل إلى السيرفر
      const response = await api.post('/api/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      // بعد النجاح، قم بتسجيل دخول المستخدم تلقائيًا
      const { token, user } = response.data;
      login(token, user); // تحديث الـ context وحفظ التوكن

      // الانتقال إلى الصفحة الرئيسية
      navigate('/');

    } catch (err) {
      // عرض رسالة الخطأ الحقيقية من السيرفر
      const errorMessage = err.response?.data?.error || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>إنشاء حساب جديد في Otogram</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">اسم المستخدم</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="اختر اسم مستخدم فريد"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">البريد الإلكتروني</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="example@email.com"
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
              minLength="6"
              placeholder="6 أحرف على الأقل"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">تأكيد كلمة المرور</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="أعد إدخال كلمة المرور"
            />
          </div>

          {/* ✨ تم حذف كل ما يتعلق بـ isCreator و creatorPassword من هنا */}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
          </button>
        </form>

        <p className="auth-link">
          لديك حساب بالفعل؟ <Link to="/login">سجل الدخول</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
