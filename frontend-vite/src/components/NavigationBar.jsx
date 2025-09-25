import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaUser, FaPlus } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './NavigationBar.css';

const NavigationBar = ({ currentPage }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleProfileClick = () => {
    if (user) {
      navigate(`/profile/${user.username}`);
    } else {
      navigate('/login');
    }
  };

  const handleUploadClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    // أي مستخدم مسجل يمكنه الذهاب لصفحة الرفع
    navigate('/upload');
  };

  return (
    <div className="navigation-bar">
      {/* حساب المستخدم - اليمين */}
      <button 
        className={`nav-item ${currentPage === 'profile' ? 'active' : ''}`}
        onClick={handleProfileClick}
      >
        <FaUser className="nav-icon" />
        <span className="nav-label">حسابي</span>
      </button>

      {/* زر رفع الفيديو - الوسط */}
      <button 
        className="nav-item upload-button"
        onClick={handleUploadClick}
      >
        <div className="upload-icon-wrapper">
          <FaPlus className="nav-icon" />
        </div>
      </button>

      {/* الصفحة الرئيسية - اليسار */}
      <button 
        className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <FaHome className="nav-icon" />
        <span className="nav-label">الرئيسية</span>
      </button>
    </div>
  );
};

export default NavigationBar;