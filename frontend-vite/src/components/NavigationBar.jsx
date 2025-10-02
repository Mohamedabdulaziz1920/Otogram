import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
// ✨ تم التأكد من أن FaShieldAlt هو المستورد الصحيح
import { FaHome, FaUser, FaPlus, FaShieldAlt } from 'react-icons/fa'; 
import { useAuth } from '../context/AuthContext';
import './NavigationBar.css';

const NavigationBar = ({ currentPage }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const canUpload = user && (user.role === 'creator' || user.role === 'admin');
  const isAdmin = user && user.role === 'admin';

  const handleProfileClick = () => {
    if (isAuthenticated && user?.username) {
      navigate(`/profile/${user.username}`);
    } else {
      navigate('/login');
    }
  };

  const handleUploadClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (canUpload) {
      navigate('/upload');
    } else {
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

      {/* --- زر رفع الفيديو --- */}
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
        <span className="nav-label">{isAuthenticated ? 'حسابي' : 'الدخول'}</span>
      </button>

      {/* --- زر لوحة التحكم (للأدمن فقط) --- */}
      {isAdmin && (
        <Link 
          to="/admin" 
          className={`nav-item ${currentPage === 'admin' ? 'active' : ''}`}
        >
          {/* ✨ تم تصحيح اسم الأيقونة هنا */}
          <FaShieldAlt className="nav-icon" /> 
          <span className="nav-label">الأدمن</span>
        </Link>
      )}
    </nav>
  );
};

export default NavigationBar;
