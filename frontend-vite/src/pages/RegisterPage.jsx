import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  User, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Music,
  Video,
  Heart,
  MessageCircle
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

    // حساب قوة كلمة المرور
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // التحقق من اسم المستخدم
    if (formData.username.length < 3) {
      setError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }

    // التحقق من تطابق كلمات المرور
    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    // التحقق من قوة كلمة المرور
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

      // الانتقال إلى الصفحة الرئيسية
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
    <div className="auth-page">
      {/* خلفية TikTok المتحركة */}
      <div className="auth-background">
        <div className="neon-orb cyan-orb orb-1"></div>
        <div className="neon-orb pink-orb orb-2"></div>
        <div className="neon-orb cyan-orb orb-3"></div>
        <div className="grid-overlay"></div>
        
        {/* أيقونات عائمة */}
        <div className="floating-icons">
          <Music className="float-icon icon-1" size={40} />
          <Video className="float-icon icon-2" size={36} />
          <Heart className="float-icon icon-3" size={32} />
          <MessageCircle className="float-icon icon-4" size={38} />
          <Sparkles className="float-icon icon-5" size={34} />
        </div>
      </div>

      <div className="auth-container">
        {/* الشعار والعنوان */}
        <div className="auth-header">
          <div className="logo-wrapper">
            <div className="logo-icon">
              <Music size={40} strokeWidth={2.5} />
              <div className="logo-glow"></div>
            </div>
          </div>
          
          <h1 className="auth-title">انضم إلى Otogram</h1>
          <p className="auth-subtitle">ابدأ مشاركة إبداعك مع العالم ✨</p>
        </div>

        {/* النموذج */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* اسم المستخدم */}
          <div className="tiktok-input-group">
            <label htmlFor="username" className="tiktok-label">
              <User size={18} strokeWidth={2.5} />
              اسم المستخدم
            </label>
            <div className="input-wrapper">
              <User className="input-icon" size={20} />
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
                <CheckCircle2 className="input-check" size={20} />
              )}
            </div>
          </div>

          {/* البريد الإلكتروني */}
          <div className="tiktok-input-group">
            <label htmlFor="email" className="tiktok-label">
              <Mail size={18} strokeWidth={2.5} />
              البريد الإلكتروني
            </label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
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
                <CheckCircle2 className="input-check" size={20} />
              )}
            </div>
          </div>

          {/* كلمة المرور */}
          <div className="tiktok-input-group">
            <label htmlFor="password" className="tiktok-label">
              <Lock size={18} strokeWidth={2.5} />
              كلمة المرور
            </label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
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
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {/* مؤشر قوة كلمة المرور */}
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill"
                    style={{ 
                      width: `${passwordStrength}%`,
                      background: getStrengthColor()
                    }}
                  ></div>
                </div>
                <span 
                  className="strength-text"
                  style={{ color: getStrengthColor() }}
                >
                  {getStrengthText()}
                </span>
              </div>
            )}
          </div>

          {/* تأكيد كلمة المرور */}
          <div className="tiktok-input-group">
            <label htmlFor="confirmPassword" className="tiktok-label">
              <Lock size={18} strokeWidth={2.5} />
              تأكيد كلمة المرور
            </label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
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
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <CheckCircle2 className="input-check match" size={20} />
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

          {/* زر الإرسال */}
          <button 
            type="submit" 
            className="tiktok-btn-submit" 
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="btn-loader"></div>
                <span>جاري إنشاء حسابك...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} strokeWidth={2.5} />
                <span>إنشاء حساب</span>
                <ArrowRight size={20} strokeWidth={2.5} />
                <div className="btn-glow"></div>
              </>
            )}
          </button>
        </form>

        {/* رابط تسجيل الدخول */}
        <div className="auth-footer">
          <p className="auth-link">
            لديك حساب بالفعل؟
            <Link to="/login" className="link-gradient">
              سجل الدخول
              <ArrowRight size={16} />
            </Link>
          </p>
        </div>

        {/* ميزات المنصة */}
        <div className="features-grid">
          <div className="feature-item">
            <Video className="feature-icon" size={24} />
            <span>شارك الفيديوهات</span>
          </div>
          <div className="feature-item">
            <Heart className="feature-icon" size={24} />
            <span>تفاعل مع المحتوى</span>
          </div>
          <div className="feature-item">
            <MessageCircle className="feature-icon" size={24} />
            <span>تواصل مع الآخرين</span>
          </div>
        </div>
      </div>
    </div>
  );
};


export default RegisterPage;
