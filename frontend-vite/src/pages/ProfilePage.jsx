import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { 
  FaSignOutAlt, FaCamera, FaHeart, FaPlay, FaTrash, 
  FaFilm, FaReply, FaEdit, FaCheck, FaTimes, 
  FaCog, FaShare, FaEllipsisV, FaUserEdit, FaShieldAlt,
  FaComment, FaBell, FaLock
} from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import './ProfilePage.css';

const ProfilePage = () => {
  const { username } = useParams();
  const { user, logout, updateUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

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
  const [notification, setNotification] = useState(null);

  const isOwnProfile = user && user.username === username;

  const getAssetUrl = (url) => {
    if (!url || url === '/default-avatar.png') return '/default-avatar.png';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
  };

  // Fetch profile
  const fetchProfileData = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/users/profile/${username}`);
      if (!response.data || !response.data.user) {
        setProfileUser(null);
        return;
      }
      setProfileUser(response.data.user);
      setVideos(response.data.videos || []);
      setReplies(response.data.replies || []);
      setStats(response.data.stats || { videosCount:0,repliesCount:0,totalLikes:0 });

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
    if (!authLoading) fetchProfileData();
  }, [authLoading, fetchProfileData]);

  // Image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profileImage', file);
    setUploadingImage(true);

    try {
      const response = await api.post('/api/users/me/update-profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setProfileUser(prev => ({ ...prev, profileImage: response.data.profileImage }));
      updateUser({ profileImage: response.data.profileImage });
      showNotification('تم تحديث الصورة بنجاح', 'success');
    } catch (error) {
      console.error(error);
      showNotification('فشل تحديث الصورة', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // Update username
  const handleUsernameUpdate = async () => {
    if (!newUsername || newUsername === profileUser.username) {
      setEditingUsername(false);
      return;
    }

    try {
      const response = await api.patch('/api/users/me/update-username', { username: newUsername });
      setProfileUser(prev => ({ ...prev, username: response.data.username }));
      updateUser({ username: response.data.username });
      setEditingUsername(false);
      navigate(`/profile/${response.data.username}`, { replace: true });
      showNotification('تم تحديث اسم المستخدم بنجاح', 'success');
    } catch (error) {
      console.error(error);
      showNotification(error.response?.data?.message || 'فشل تحديث اسم المستخدم', 'error');
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!videoToDelete) return;
    try {
      await api.delete(`/api/videos/${videoToDelete.id}`);
      if (videoToDelete.type === 'video') {
        setVideos(prev => prev.filter(v => v._id !== videoToDelete.id));
        setReplies(prev => prev.filter(r => r.replyTo !== videoToDelete.id));
      } else {
        setReplies(prev => prev.filter(r => r._id !== videoToDelete.id));
      }
      setShowDeleteModal(false);
      setVideoToDelete(null);
      showNotification('تم الحذف بنجاح', 'success');
      fetchProfileData();
    } catch (error) {
      console.error(error);
      showNotification('فشل الحذف', 'error');
    }
  };

  const confirmDelete = (id, type) => {
    setVideoToDelete({ id, type });
    setShowDeleteModal(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const shareProfile = () => {
    const profileUrl = `${window.location.origin}/profile/${profileUser.username}`;
    if (navigator.share) {
      navigator.share({ 
        title: `${profileUser.username}@ على Otogram`, 
        url: profileUrl 
      });
    } else { 
      navigator.clipboard.writeText(profileUrl); 
      showNotification('تم نسخ الرابط','success'); 
    }
  };

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="loading-wrapper">
          <div className="loading-spinner"></div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="error-container">
        <div className="error-wrapper">
          <h2>المستخدم غير موجود</h2>
          <button onClick={() => navigate('/')} className="back-btn">
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  let displayedContent = [];
  switch (activeTab) {
    case 'posts': displayedContent = videos; break;
    case 'replies': displayedContent = replies; break;
    case 'liked': displayedContent = likedVideos; break;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-header-actions">
            {isOwnProfile && (
              <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
                <FaCog />
              </button>
            )}
            <button className="share-btn" onClick={shareProfile}>
              <FaShare />
            </button>
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="profile-info-section">
          <div className="profile-avatar-container">
            <div className={`profile-avatar ${isOwnProfile ? 'editable' : ''}`}>
              <img 
                src={getAssetUrl(profileUser.profileImage)} 
                alt={profileUser.username} 
                className="profile-avatar-img" 
              />
              {isOwnProfile && (
                <>
                  <label htmlFor="profile-image-input" className="avatar-edit-overlay">
                    <FaCamera className="camera-icon" />
                    <span>{uploadingImage ? 'جاري...' : 'تغيير الصورة'}</span>
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

          <div className="profile-info">
            <div className="username-container">
              {editingUsername ? (
                <div className="username-edit-mode">
                  <input 
                    type="text" 
                    value={newUsername} 
                    onChange={(e) => setNewUsername(e.target.value)} 
                    placeholder="اسم المستخدم الجديد" 
                    className="username-input" 
                    autoFocus 
                  />
                  <div className="edit-actions">
                    <button onClick={handleUsernameUpdate} className="save-username-btn">
                      <FaCheck />
                    </button>
                    <button onClick={() => setEditingUsername(false)} className="cancel-edit-btn">
                      <FaTimes />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="username-display-mode">
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
                  <h1 className="profile-username">@{profileUser.username}</h1>
                </div>
              )}
            </div>

            {profileUser.bio && (
              <p className="profile-bio">{profileUser.bio}</p>
            )}

            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-value">{stats.videosCount}</span>
                <span className="stat-label">منشور</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-value">{stats.repliesCount}</span>
                <span className="stat-label">رد</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-value">{stats.totalLikes}</span>
                <span className="stat-label">إعجاب</span>
              </div>
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
          {displayedContent.length > 0 ? (
            <div className="videos-grid">
              {displayedContent.map(item => (
                <div key={item._id} className="video-card">
                  {isOwnProfile && (activeTab === 'posts' || activeTab === 'replies') && (
                    <button 
                      className="delete-btn" 
                      onClick={(e) => {
                        e.stopPropagation(); 
                        confirmDelete(item._id, activeTab === 'posts' ? 'video' : 'reply');
                      }}
                    >
                      <FaTrash />
                    </button>
                  )}
                  <div 
                    className="video-thumbnail" 
                    onClick={() => navigate(`/video/${item._id}`)}
                  >
                    <video 
                      src={getAssetUrl(item.videoUrl)} 
                      muted 
                      onMouseEnter={e => e.target.play()} 
                      onMouseLeave={e => {
                        e.target.pause(); 
                        e.target.currentTime = 0;
                      }} 
                    />
                    <div className="video-overlay">
                      <div className="video-stats">
                        <span className="stat">
                          <FaPlay /> {item.views || 0}
                        </span>
                        <span className="stat">
                          <FaHeart /> {item.likes?.length || 0}
                        </span>
                        <span className="stat">
                          <FaComment /> {item.comments?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                {activeTab === 'posts' && <FaFilm />}
                {activeTab === 'replies' && <FaReply />}
                {activeTab === 'liked' && <FaHeart />}
              </div>
              <p>لا يوجد محتوى لعرضه</p>
              {isOwnProfile && activeTab === 'posts' && (
                <button className="upload-btn" onClick={() => navigate('/upload')}>
                  رفع فيديو جديد
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تأكيد الحذف</h3>
            </div>
            <div className="modal-body">
              <p>
                {videoToDelete?.type === 'video' 
                  ? 'سيتم حذف هذا الفيديو وجميع الردود المرتبطة به. هل أنت متأكد؟' 
                  : 'هل أنت متأكد من حذف هذا الرد؟'}
              </p>
            </div>
            <div className="modal-actions">
              <button className="confirm-delete-btn" onClick={handleDelete}>
                <FaTrash /> حذف نهائياً
              </button>
              <button className="cancel-modal-btn" onClick={() => setShowDeleteModal(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Sidebar */}
      {showSettings && isOwnProfile && (
        <>
          <div className="settings-overlay" onClick={() => setShowSettings(false)}></div>
          <div className="settings-sidebar">
            <div className="settings-header">
              <h3>الإعدادات</h3>
              <button className="close-settings" onClick={() => setShowSettings(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="settings-options">
              <button className="setting-option">
                <FaUserEdit />
                <span>تعديل الملف الشخصي</span>
              </button>
              <button className="setting-option">
                <FaShieldAlt />
                <span>الخصوصية والأمان</span>
              </button>
              <button className="setting-option">
                <FaBell />
                <span>الإشعارات</span>
              </button>
              <button className="setting-option">
                <FaLock />
                <span>تغيير كلمة المرور</span>
              </button>
              <button className="setting-option">
                <FaHeart />
                <span>إدارة الإعجابات</span>
              </button>
              <div className="settings-divider"></div>
              <button className="setting-option danger" onClick={handleLogout}>
                <FaSignOutAlt />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`notification-toast ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <NavigationBar currentPage="profile" />
    </div>
  );
};

export default ProfilePage;
