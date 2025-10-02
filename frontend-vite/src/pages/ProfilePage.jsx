import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { 
  FaSignOutAlt, FaCamera, FaHeart, FaPlay, FaTrash, 
  FaFilm, FaReply, FaEdit, FaCheck, FaTimes, 
  FaCog, FaShare, FaEllipsisV 
} from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import './ProfilePage.css';

const ProfilePage = () => {
  const { username } = useParams();
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  
  // States
  const [profileUser, setProfileUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [replies, setReplies] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [stats, setStats] = useState({ videosCount: 0, repliesCount: 0, totalLikes: 0 });
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const isOwnProfile = user && user.username === username;

  // Helper Functions
  const getAssetUrl = (url) => {
    if (!url || url === '/default-avatar.png') return '/default-avatar.png';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
  };

  // Fetch Profile Data
  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/users/profile/${username}`);
      setProfileUser(response.data.user);
      setVideos(response.data.videos || []);
      setReplies(response.data.replies || []);
      setStats(response.data.stats || { videosCount: 0, repliesCount: 0, totalLikes: 0 });
      
      if (isOwnProfile) {
        try {
          const likedRes = await api.get('/api/users/me/liked-videos');
          setLikedVideos(likedRes.data || []);
        } catch (error) {
          console.error('Error fetching liked videos:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setProfileUser(null);
    } finally {
      setLoading(false);
    }
  }, [username, isOwnProfile]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Handle Image Upload
const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('profileImage', file);

  setUploadingImage(true);
  try {
    const response = await api.post('/api/users/update-profile-image', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    setProfileUser(prev => ({ ...prev, profileImage: response.data.profileImage }));
    updateUser({ profileImage: response.data.profileImage });
    
    showNotification('تم تحديث الصورة بنجاح', 'success');
  } catch (error) {
    console.error('Error uploading image:', error);
    showNotification('فشل تحديث الصورة', 'error');
  } finally {
    setUploadingImage(false);
  }
};

  // Handle Username Update
  const handleUsernameUpdate = async () => {
    if (!newUsername || newUsername === profileUser.username) {
      setEditingUsername(false);
      return;
    }

    try {
      const response = await api.put('/api/users/update-username', { 
        username: newUsername 
      });
      
      setProfileUser(prev => ({ ...prev, username: response.data.username }));
      updateUser({ username: response.data.username });
      setEditingUsername(false);
      
      // Navigate to new profile URL
      navigate(`/profile/${response.data.username}`, { replace: true });
      showNotification('تم تحديث اسم المستخدم بنجاح', 'success');
    } catch (error) {
      console.error('Error updating username:', error);
      showNotification(error.response?.data?.message || 'فشل تحديث اسم المستخدم', 'error');
    }
  };

  // Handle Delete Video/Reply
  const handleDelete = async () => {
    if (!videoToDelete) return;

    try {
      await api.delete(`/api/videos/${videoToDelete.id}`);
      
      if (videoToDelete.type === 'video') {
        setVideos(prev => prev.filter(v => v._id !== videoToDelete.id));
        // Remove associated replies
        setReplies(prev => prev.filter(r => r.replyTo !== videoToDelete.id));
      } else {
        setReplies(prev => prev.filter(r => r._id !== videoToDelete.id));
      }
      
      setShowDeleteModal(false);
      setVideoToDelete(null);
      showNotification('تم الحذف بنجاح', 'success');
      
      // Update stats
      fetchProfileData();
    } catch (error) {
      console.error('Error deleting:', error);
      showNotification('فشل الحذف', 'error');
    }
  };

  // Show Delete Confirmation
  const confirmDelete = (id, type) => {
    setVideoToDelete({ id, type });
    setShowDeleteModal(true);
  };

  // Handle Logout
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Show Notification
  const showNotification = (message, type) => {
    // You can implement a toast notification here
    console.log(`${type}: ${message}`);
  };

  // Share Profile
  const shareProfile = () => {
    const profileUrl = `${window.location.origin}/profile/${profileUser.username}`;
    if (navigator.share) {
      navigator.share({
        title: `${profileUser.username}@ على Otogram`,
        url: profileUrl
      });
    } else {
      navigator.clipboard.writeText(profileUrl);
      showNotification('تم نسخ الرابط', 'success');
    }
  };

  // Loading State
  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>جاري التحميل...</p>
    </div>
  );

  // Error State
  if (!profileUser) return (
    <div className="error-container">
      <h2>المستخدم غير موجود</h2>
      <button onClick={() => navigate('/')}>العودة للرئيسية</button>
    </div>
  );

  // Get displayed content based on active tab
  let displayedContent = [];
  switch (activeTab) {
    case 'posts':
      displayedContent = videos;
      break;
    case 'replies':
      displayedContent = replies;
      break;
    case 'liked':
      displayedContent = likedVideos;
      break;
  }

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-cover">
          {isOwnProfile && (
            <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
              <FaCog />
            </button>
          )}
          <button className="share-btn" onClick={shareProfile}>
            <FaShare />
          </button>
        </div>

        <div className="profile-main-info">
          {/* Profile Image */}
          <div className="profile-image-section">
            <div className={`profile-image-wrapper ${isOwnProfile ? 'editable' : ''}`}>
              <img 
                src={getAssetUrl(profileUser.profileImage)} 
                alt={profileUser.username} 
                className="profile-image"
              />
              {isOwnProfile && (
                <>
                  <label htmlFor="profile-image-input" className="edit-image-overlay">
                    <FaCamera />
                    <span>{uploadingImage ? 'جاري...' : 'تغيير'}</span>
                  </label>
                  <input 
                    type="file" 
                    id="profile-image-input" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    hidden 
                    disabled={uploadingImage} 
                  />
                </>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="profile-details">
            {/* Username */}
            <div className="username-section">
              {editingUsername ? (
                <div className="username-edit">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="اسم المستخدم الجديد"
                    className="username-input"
                    autoFocus
                  />
                  <button onClick={handleUsernameUpdate} className="save-btn">
                    <FaCheck />
                  </button>
                  <button onClick={() => setEditingUsername(false)} className="cancel-btn">
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <div className="username-display">
                  <h1 className="profile-username">{profileUser.username}@</h1>
                  {isOwnProfile && (
                    <button 
                      onClick={() => {
                        setEditingUsername(true);
                        setNewUsername(profileUser.username);
                      }} 
                      className="edit-username-btn"
                    >
                      <FaEdit />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-value">{stats.videosCount}</span>
                <span className="stat-label">منشور</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.repliesCount}</span>
                <span className="stat-label">رد</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.totalLikes}</span>
                <span className="stat-label">إعجاب</span>
              </div>
            </div>

            {/* Bio */}
            {profileUser.bio && (
              <p className="profile-bio">{profileUser.bio}</p>
            )}

            {/* Action Buttons */}
            {isOwnProfile && (
              <div className="profile-actions">
                <button className="logout-btn" onClick={handleLogout}>
                  <FaSignOutAlt /> تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button 
          className={`tab ${activeTab === 'posts' ? 'active' : ''}`} 
          onClick={() => setActiveTab('posts')}
        >
          <FaFilm />
          <span>المنشورات</span>
        </button>
        <button 
          className={`tab ${activeTab === 'replies' ? 'active' : ''}`} 
          onClick={() => setActiveTab('replies')}
        >
          <FaReply />
          <span>الردود</span>
        </button>
        {isOwnProfile && (
          <button 
            className={`tab ${activeTab === 'liked' ? 'active' : ''}`} 
            onClick={() => setActiveTab('liked')}
          >
            <FaHeart />
            <span>الإعجابات</span>
          </button>
        )}
      </div>

      {/* Content Grid */}
      <div className="profile-content">
        <div className="videos-grid">
          {displayedContent.map((item) => (
            <div key={item._id} className="video-item">
              <div 
                className="video-thumbnail"
                onClick={() => navigate(`/video/${item._id}`)}
              >
                <video 
                  src={getAssetUrl(item.videoUrl)} 
                  muted 
                  onMouseEnter={(e) => e.target.play()} 
                  onMouseLeave={(e) => {
                    e.target.pause();
                    e.target.currentTime = 0;
                  }} 
                />
                <div className="video-overlay">
                  <div className="video-stats">
                    <span><FaHeart /> {item.likes?.length || 0}</span>
                    <span><FaPlay /> {item.views || 0}</span>
                  </div>
                </div>
              </div>
              
              {isOwnProfile && (activeTab === 'posts' || activeTab === 'replies') && (
                <button 
                  className="video-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDelete(item._id, activeTab === 'posts' ? 'video' : 'reply');
                  }}
                >
                  <FaEllipsisV />
                </button>
              )}
            </div>
          ))}
        </div>

        {displayedContent.length === 0 && (
          <div className="empty-state">
            <p>لا يوجد محتوى لعرضه</p>
            {isOwnProfile && activeTab === 'posts' && (
              <button 
                className="upload-btn"
                onClick={() => navigate('/upload')}
              >
                رفع فيديو جديد
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>تأكيد الحذف</h3>
            <p>
              {videoToDelete?.type === 'video' 
                ? 'سيتم حذف هذا الفيديو وجميع الردود المرتبطة به. هل أنت متأكد؟'
                : 'هل أنت متأكد من حذف هذا الرد؟'}
            </p>
            <div className="modal-actions">
              <button className="confirm-btn" onClick={handleDelete}>
                <FaTrash /> حذف
              </button>
                </div>
          </div>
        </div>
      )}

      {/* Settings Menu */}
      {showSettings && isOwnProfile && (
        <div className="settings-menu">
          <div className="settings-header">
            <h3>الإعدادات</h3>
            <button onClick={() => setShowSettings(false)}>
              <FaTimes />
            </button>
          </div>
          <div className="settings-options">
            <button className="setting-option">
              <FaCog /> إعدادات الحساب
            </button>
            <button className="setting-option">
              <FaHeart /> إدارة الإعجابات
            </button>
            <button className="setting-option danger" onClick={handleLogout}>
              <FaSignOutAlt /> تسجيل الخروج
            </button>
          </div>
        </div>
      )}

      <NavigationBar currentPage="profile" />
    </div>
  );
};

export default ProfilePage;
