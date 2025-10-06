import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import OtogramIcon from '../components/OtogramIcon';
import { 
  User, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  Music,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import './RegisterPage.css';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  // دالة قياس قوة كلمة المرور
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.length >= 10) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
    return Math.min(strength, 100);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.username.length < 3) {
      setError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    if (formData.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      const { token, user } = response.data;
      login(token, user);
      navigate('/');

    } catch (err) {
      const errorMessage = err.response?.data?.error || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength < 30) return '#FE2C55';
    if (passwordStrength < 60) return '#FFA500';
    return '#00F2EA';
  };

  const getStrengthText = () => {
    if (passwordStrength < 30) return 'ضعيفة';
    if (passwordStrength < 60) return 'متوسطة';
    return 'قوية';
  };

  return (
    <div className="register-page">
      {/* خلفية TikTok المتحركة - نفس تصميم UploadPage */}
      <div className="tiktok-background">
        <div className="neon-orb cyan-orb orb-1"></div>
        <div className="neon-orb pink-orb orb-2"></div>
        <div className="neon-orb cyan-orb orb-3"></div>
        <div className="grid-overlay"></div>
      </div>

      <div className="register-container">
        {/* Header بنفس أسلوب UploadPage */}
        <div className="register-header">
          <button className="tiktok-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          
          <div className="header-content">
           <div className="tiktok-icon-wrapper">
  <OtogramIcon size={60} />
  <div className="icon-glow"></div>
</div>
            
            <h1 className="tiktok-title">انضم إلى Otogram</h1>
            <p className="tiktok-subtitle">ابدأ مشاركة إبداعك مع العالم ✨</p>
          </div>
        </div>

        {/* النموذج */}
        <form onSubmit={handleSubmit} className="register-form">
          {/* اسم المستخدم */}
          <div className="tiktok-form-group">
            <label htmlFor="username" className="tiktok-label">
              <User size={20} strokeWidth={2.5} />
              <span>اسم المستخدم</span>
            </label>
            <div className="input-container">
              <User className="input-icon-left" size={20} />
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="اختر اسم مستخدم فريد"
                className="tiktok-input"
                minLength="3"
              />
              {formData.username.length >= 3 && (
                <CheckCircle2 className="input-icon-right check-icon" size={20} />
              )}
            </div>
          </div>

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
                placeholder="example@email.com"
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
                minLength="6"
                placeholder="6 أحرف على الأقل"
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
            
            {/* مؤشر قوة كلمة المرور */}
            {formData.password && (
              <div className="password-strength-indicator">
                <div className="strength-bar-container">
                  <div 
                    className="strength-bar-fill"
                    style={{ 
                      width: `${passwordStrength}%`,
                      background: getStrengthColor()
                    }}
                  >
                    <div className="progress-shimmer"></div>
                  </div>
                </div>
                <span 
                  className="strength-label"
                  style={{ color: getStrengthColor() }}
                >
                  {getStrengthText()}
                </span>
              </div>
            )}
          </div>

          {/* تأكيد كلمة المرور */}
          <div className="tiktok-form-group">
            <label htmlFor="confirmPassword" className="tiktok-label">
              <ShieldCheck size={20} strokeWidth={2.5} />
              <span>تأكيد كلمة المرور</span>
            </label>
            <div className="input-container">
              <Lock className="input-icon-left" size={20} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="أعد إدخال كلمة المرور"
                className="tiktok-input"
              />
              <button
                type="button"
                className="input-icon-right password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <CheckCircle2 className="input-icon-right check-icon match-icon" size={20} />
              )}
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
                  <span>جاري إنشاء حسابك...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} strokeWidth={2.5} />
                  <span>إنشاء حساب</span>
                  <div className="btn-glow"></div>
                </>
              )}
            </button>
            
            <button 
              type="button" 
              className="tiktok-btn-ghost" 
              onClick={() => navigate(-1)}
            >
              إلغاء
            </button>
          </div>
        </form>

        {/* رابط تسجيل الدخول */}
        <div className="register-footer">
          <p className="footer-text">
            لديك حساب بالفعل؟
            <Link to="/login" className="footer-link">
              سجل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};


export default RegisterPage;
