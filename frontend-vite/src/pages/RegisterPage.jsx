import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    isCreator: false,
    creatorPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    if (formData.isCreator && !formData.creatorPassword) {
      setError('يجب إدخال كلمة مرور المنشئ');
      return;
    }

    setLoading(true);

    const result = await register({
      username: formData.username,
      email: formData.email,
      password: formData.password,
      isCreator: formData.isCreator,
      creatorPassword: formData.isCreator ? formData.creatorPassword : undefined
    });
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>إنشاء حساب جديد</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>اسم المستخدم</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="اختر اسم مستخدم"
            />
          </div>

          <div className="form-group">
            <label>البريد الإلكتروني</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="example@email.com"
            />
          </div>

          <div className="form-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="أدخل كلمة مرور قوية"
            />
          </div>

          <div className="form-group">
            <label>تأكيد كلمة المرور</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="أعد إدخال كلمة المرور"
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isCreator"
                checked={formData.isCreator}
                onChange={handleChange}
              />
              <span> أنا منشئ محتوى</span>
            </label>
          </div>

          {formData.isCreator && (
            <div className="form-group">
              <label>كلمة مرور المنشئ</label>
              <input
                type="password"
                name="creatorPassword"
                value={formData.creatorPassword}
                onChange={handleChange}
                placeholder="كلمة مرور خاصة لنشر الفيديوهات"
              />
              <small>ستحتاج هذه الكلمة عند نشر فيديو أساسي</small>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

                   <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
          </button>
        </form>

        <p className="auth-link">
          لديك حساب بالفعل؟ <Link to="/login">سجل دخول</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
