import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  FaHome, FaUser, FaPlus, FaShieldAlt, FaCompass,
  FaBell, FaInbox, FaUserFriends, FaSearch, FaHeart
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './NavigationBar.css';

const NavigationBar = ({ currentPage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [showUploadTip, setShowUploadTip] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const canUpload = user && (user.role === 'creator' || user.role === 'admin');
  const isAdmin = user && user.role === 'admin';

  // Get profile image URL
  const getProfileImage = () => {
    if (!user?.profileImage || user.profileImage === '/default-avatar.png') {
      return '/default-avatar.png';
    }
    if (user.profileImage.startsWith('http')) {
      return user.profileImage;
    }
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseUrl}${user.profileImage}`;
  };

  // Handle profile navigation
  const handleProfileClick = () => {
    if (isAuthenticated && user?.username) {
      navigate(`/profile/${user.username}`);
    } else {
      navigate('/login');
    }
  };

  // Handle upload click
  const handleUploadClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (canUpload) {
      navigate('/upload');
    } else {
      setShowUploadTip(true);
      setTimeout(() => setShowUploadTip(false), 3000);
    }
  };

  // Handle discover/explore
  const handleDiscoverClick = () => {
    navigate('/discover');
  };

  // Handle notifications (future feature)
  const handleNotificationsClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate('/notifications');
  };

  // Determine active page
  const isActive = (page) => {
    if (page === 'home' && location.pathname === '/') return true;
    if (page === 'discover' && location.pathname === '/discover') return true;
    if (page === 'profile' && location.pathname.includes('/profile')) return true;
    if (page === 'admin' && location.pathname === '/admin') return true;
    return currentPage === page;
  };

  return (
    <>
      {/* Navigation Bar */}
      <nav className="navigation-bar">
        <div className="nav-container">
          {/* Home */}
          <Link 
            to="/" 
            className={`nav-item ${isActive('home') ? 'active' : ''}`}
            aria-label="Home"
          >
            <div className="nav-icon-wrapper">
              <FaHome className="nav-icon" />
              {isActive('home') && <div className="active-indicator"></div>}
            </div>
            <span className="nav-label">الرئيسية</span>
          </Link>

          {/* Discover */}
          <button 
            onClick={handleDiscoverClick}
            className={`nav-item ${isActive('discover') ? 'active' : ''}`}
            aria-label="Discover"
          >
            <div className="nav-icon-wrapper">
              <FaCompass className="nav-icon" />
              {isActive('discover') && <div className="active-indicator"></div>}
            </div>
            <span className="nav-label">اكتشف</span>
          </button>

          {/* Upload Button - Center */}
          <button 
            className="nav-item upload-button"
            onClick={handleUploadClick}
            aria-label="Upload Video"
          >
            <div className="upload-icon-wrapper">
              <div className="upload-icon-bg">
                <div className="upload-icon-left"></div>
                <div className="upload-icon-center">
                  <FaPlus className="upload-icon" />
                </div>
                <div className="upload-icon-right"></div>
              </div>
            </div>
          </button>

          {/* Notifications/Inbox */}
          <button 
            onClick={handleNotificationsClick}
            className={`nav-item ${isActive('notifications') ? 'active' : ''}`}
            aria-label="Notifications"
          >
            <div className="nav-icon-wrapper">
              <FaInbox className="nav-icon" />
              {notificationCount > 0 && (
                <span className="notification-badge">{notificationCount}</span>
              )}
              {isActive('notifications') && <div className="active-indicator"></div>}
            </div>
            <span className="nav-label">البريد</span>
          </button>

          {/* Profile */}
          <button 
            onClick={handleProfileClick}
            className={`nav-item ${isActive('profile') ? 'active' : ''}`}
            aria-label="Profile"
          >
            <div className="nav-icon-wrapper">
              {isAuthenticated && user ? (
                <div className="profile-avatar-nav">
                  <img 
                    src={getProfileImage()} 
                    alt={user.username}
                    className="nav-profile-img"
                  />
                  {isActive('profile') && <div className="active-ring"></div>}
                </div>
              ) : (
                <>
                  <FaUser className="nav-icon" />
                  {isActive('profile') && <div className="active-indicator"></div>}
                </>
              )}
            </div>
            <span className="nav-label">
              {isAuthenticated ? 'أنا' : 'الدخول'}
            </span>
          </button>

          {/* Admin - Only for admins */}
          {isAdmin && (
            <Link 
              to="/admin" 
              className={`nav-item admin-item ${isActive('admin') ? 'active' : ''}`}
              aria-label="Admin Dashboard"
            >
              <div className="nav-icon-wrapper">
                <FaShieldAlt className="nav-icon admin-icon" />
                {isActive('admin') && <div className="active-indicator"></div>}
              </div>
              <span className="nav-label">الإدارة</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Upload Tip Tooltip */}
      {showUploadTip && (
        <div className="upload-tip">
          <p>ليس لديك صلاحية النشر</p>
          <span>تواصل مع الإدارة للحصول على صلاحية منشئ المحتوى</span>
        </div>
      )}
    </>
  );
};

export default NavigationBar;