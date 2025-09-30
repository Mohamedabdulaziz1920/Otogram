import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaHome, FaUser, FaPlus, FaShieldAlt } from 'react-icons/fa'; // FaShieldAlt للأدمن
import { useAuth } from '../context/AuthContext';
import './NavigationBar.css';

const NavigationBar = ({ currentPage }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // التحقق مما إذا كان المستخدم لديه صلاحية النشر
  const canUpload = user && (user.role === 'creator' || user.role === 'admin');
  const isAdmin = user && user.role === 'admin';

  const handleProfileClick = () => {
    if (user) {
      navigate(`/profile/${user.username}`);
    } else {
      navigate('/login');
    }
  };

  const handleUploadClick = () => {
    if (!user) {
      navigate('/login'); // إذا لم يكن مسجلاً، اذهب لصفحة الدخول
      return;
    }
    if (canUpload) {
      navigate('/upload'); // إذا كان لديه الصلاحية، اذهب لصفحة الرفع
    } else {
      // (اختياري) يمكنك عرض رسالة للمستخدم العادي
      alert('ليس لديك صلاحية النشر. تواصل مع الإدارة.');
    }
  };

  return (
    <nav className="navigation-bar">
      {/* --- زر الرئيسية --- */}
      <Link to="/" className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}>
        <FaHome className="nav-icon" />
        <span className="nav-label">الرئيسية</span>
      </Link>

      {/* --- زر رفع الفيديو (يظهر للجميع، ولكن وظيفته تختلف) --- */}
      <button 
        className="nav-item upload-button"
        onClick={handleUploadClick}
        aria-label="Upload Video"
      >
        <div className="upload-icon-wrapper">
          <FaPlus className="nav-icon" />
        </div>
      </button>

      {/* --- زر الملف الشخصي --- */}
      <button 
        onClick={handleProfileClick}
        className={`nav-item ${currentPage === 'profile' ? 'active' : ''}`}
      >
        <FaUser className="nav-icon" />
        <span className="nav-label">{user ? 'حسابي' : 'الدخول'}</span>
      </button>

      {/* --- ✨ زر لوحة التحكم (يظهر للأدمن فقط) --- */}
      {isAdmin && (
        <Link to="/admin" className={`nav-item ${currentPage === 'admin' ? 'active' : ''}`}>
          <FaShieldAlt className="nav-icon" />
          <span className="nav-label">الأدمن</span>
        </Link>
      )}
    </nav>
  );
};

export default NavigationBar;
