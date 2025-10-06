import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import OtogramIcon from '../components/OtogramIcon';
import { 
  Mail, 
  Lock, 
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  Music,
  Loader2,
  LogIn,
  CheckCircle2
} from 'lucide-react';
import './LoginPage.css';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

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
      const response = await api.post('/api/auth/login', {
        email: formData.email,
        password: formData.password,
      });

      const { token, user } = response.data;
      login(token, user);

      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/';
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectPath);

    } catch (err) {
      const errorMessage = err.response?.data?.error || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* خلفية TikTok المتحركة - نفس تصميم UploadPage */}
      <div className="tiktok-background">
        <div className="neon-orb cyan-orb orb-1"></div>
        <div className="neon-orb pink-orb orb-2"></div>
        <div className="neon-orb cyan-orb orb-3"></div>
        <div className="grid-overlay"></div>
      </div>

      <div className="login-container">
        {/* Header بنفس أسلوب UploadPage */}
        <div className="login-header">
          <button className="tiktok-back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          
          <div className="header-content">
            // في JSX، استبدل:
<div className="tiktok-icon-wrapper">
  <OtogramIcon size={60} />
  <div className="icon-glow"></div>
</div>
            
            <h1 className="tiktok-title">مرحباً بعودتك</h1>
            <p className="tiktok-subtitle">سجّل دخولك لمتابعة الإبداع 🎬</p>
          </div>
        </div>

        {/* النموذج */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* البريد الإلكتروني */}
          <div className="tiktok-form-group">
            <label htmlFor="email" className="tiktok-label">
              <Mail size={20} strokeWidth={2.5} />
              <span>البريد الإلكتروني</span>
            </label>
            <div className="input-container">
              <Mail className="input-icon-left" size={20} />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="أدخل بريدك الإلكتروني"
                className="tiktok-input"
              />
              {formData.email.includes('@') && formData.email.includes('.') && (
                <CheckCircle2 className="input-icon-right check-icon" size={20} />
              )}
            </div>
          </div>

          {/* كلمة المرور */}
          <div className="tiktok-form-group">
            <label htmlFor="password" className="tiktok-label">
              <Lock size={20} strokeWidth={2.5} />
              <span>كلمة المرور</span>
            </label>
            <div className="input-container">
              <Lock className="input-icon-left" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="أدخل كلمة المرور"
                className="tiktok-input"
              />
              <button
                type="button"
                className="input-icon-right password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* رسالة الخطأ */}
          {error && (
            <div className="tiktok-alert error-alert">
              <AlertCircle size={20} strokeWidth={2.5} />
              <span>{error}</span>
            </div>
          )}

          {/* أزرار التحكم */}
          <div className="tiktok-actions">
            <button 
              type="submit" 
              className="tiktok-btn-primary" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="spinning" size={20} strokeWidth={2.5} />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} strokeWidth={2.5} />
                  <span>تسجيل الدخول</span>
                  <div className="btn-glow"></div>
                </>
              )}
            </button>
            
            <button 
              type="button" 
              className="tiktok-btn-ghost" 
              onClick={() => navigate('/')}
            >
              إلغاء
            </button>
          </div>
        </form>

        {/* رابط إنشاء حساب */}
        <div className="login-footer">
          <p className="footer-text">
            ليس لديك حساب؟
            <Link to="/register" className="footer-link">
              أنشئ حساباً جديداً
            </Link>
          </p>
          
          {/* يمكن إضافة رابط نسيت كلمة المرور لاحقاً */}
          {/* <Link to="/forgot-password" className="forgot-link">
            نسيت كلمة المرور؟
          </Link> */}
        </div>
      </div>
    </div>
  );
};


export default LoginPage;
