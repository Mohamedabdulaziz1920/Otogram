import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaSignOutAlt, FaCamera, FaHeart, FaPlay, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import './ProfilePage.css';
import NavigationBar from '../components/NavigationBar';

// إعداد axios instance مع baseURL من متغيرات البيئة
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

const ProfilePage = () => {
  const { username } = useParams();
  const { user, logout, login } = useAuth(); // نحتاج login لتحديث المستخدم بعد تغيير الصورة
  const navigate = useNavigate();
  
  const [profileUser, setProfileUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [stats, setStats] = useState({ videosCount: 0, totalLikes: 0 });
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  const isOwnProfile = user && user.username === username;

  // دالة مساعدة لبناء الروابط
  const getAssetUrl = (url) => {
    if (!url || url === '/default-avatar.png') return '/default-avatar.png';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
  };

  // جلب بيانات الملف الشخصي (أكثر كفاءة)
  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    try {
      // ✨ 1. جلب كل البيانات في طلب واحد فقط
      const response = await api.get(`/api/users/profile/${username}`);
      setProfileUser(response.data.user);
      setVideos(response.data.videos);
      setStats(response.data.stats);
      
      if (isOwnProfile) {
        const likedRes = await api.get('/api/users/me/liked-videos', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setLikedVideos(likedRes.data);
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

  // رفع صورة الملف الشخصي
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      // ✨ 2. إرسال توكن المصادقة مع الطلب
      const response = await api.post('/api/users/me/update-profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const updatedUser = response.data.user;
      setProfileUser(updatedUser);
      login(localStorage.getItem('token'), updatedUser); // تحديث الحالة العامة
      
    } catch (error) {
      alert('فشل تحديث الصورة: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploadingImage(false);
    }
  };
  
  // حذف الفيديو
  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الفيديو؟')) return;
    try {
        // ✨ 3. إرسال توكن المصادقة مع الطلب
        await api.delete(`/api/videos/${videoId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setVideos(prevVideos => prevVideos.filter(v => v._id !== videoId));
    } catch (error) {
        alert('فشل حذف الفيديو: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;
  if (!profileUser) return <div className="error-container"><p>المستخدم غير موجود</p></div>;

  const displayedVideos = activeTab === 'posts' ? videos : likedVideos;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-main-info">
          <div className="profile-image-section">
            <label htmlFor="profile-image-input" className={`profile-image-wrapper ${isOwnProfile ? 'editable' : ''}`}>
              <img src={getAssetUrl(profileUser.profileImage)} alt={profileUser.username} className="profile-image"/>
              {isOwnProfile && (
                <div className="edit-image-overlay">
                  <FaCamera />
                  <span>{uploadingImage ? 'جاري...' : 'تغيير'}</span>
                </div>
              )}
            </label>
            {isOwnProfile && <input type="file" id="profile-image-input" accept="image/*" onChange={handleImageUpload} hidden disabled={uploadingImage} />}
          </div>
          <div className="profile-details">
            <h1 className="profile-username">@{profileUser.username}</h1>
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-value">{stats.videosCount}</span>
                <span className="stat-label">فيديو</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.totalLikes}</span>
                <span className="stat-label">إعجاب</span>
              </div>
            </div>
            {isOwnProfile && <button className="logout-btn" onClick={handleLogout}><FaSignOutAlt /> تسجيل الخروج</button>}
          </div>
        </div>
      </div>

      {isOwnProfile && (
        <div className="profile-tabs">
          <button className={`tab ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>منشوراتي</button>
          <button className={`tab ${activeTab === 'liked' ? 'active' : ''}`} onClick={() => setActiveTab('liked')}>أعجبني</button>
        </div>
      )}

      <div className="profile-content">
        <div className="videos-grid">
          {displayedVideos.map((video) => (
            <div key={video._id} className="video-item">
              <Link to={`/video/${video._id}`} className="video-thumbnail">
                <video src={getAssetUrl(video.videoUrl)} muted onMouseEnter={(e) => e.target.play()} onMouseLeave={(e) => e.target.pause()} />
                <div className="video-stats-overlay">
                  <span><FaHeart /> {video.likes?.length || 0}</span>
                  <span><FaPlay /> {video.views || 0}</span>
                </div>
              </Link>
              {isOwnProfile && activeTab === 'posts' && (
                <button className="delete-video-btn" onClick={() => handleDeleteVideo(video._id)}>
                  <FaTrash />
                </button>
              )}
            </div>
          ))}
        </div>
        {displayedVideos.length === 0 && (
          <div className="empty-state"><p>{activeTab === 'posts' ? 'لم يتم نشر أي فيديوهات بعد' : 'لم يتم الإعجاب بأي فيديوهات بعد'}</p></div>
        )}
      </div>
      <NavigationBar currentPage="profile" />
    </div>
  );
};

export default ProfilePage;
