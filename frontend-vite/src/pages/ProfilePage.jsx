// ملف: ProfilePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaSignOutAlt, FaCamera, FaHeart, FaPlay, FaTrash, FaFilm, FaReply } from 'react-icons/fa';
import axios from 'axios';
import './ProfilePage.css';
import NavigationBar from '../components/NavigationBar';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000' });

const ProfilePage = () => {
  const { username } = useParams();
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  
  const [profileUser, setProfileUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [replies, setReplies] = useState([]); // ✨ State جديد للردود
  const [likedVideos, setLikedVideos] = useState([]);
  const [stats, setStats] = useState({ videosCount: 0, repliesCount: 0, totalLikes: 0 });
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  const isOwnProfile = user && user.username === username;

  const getAssetUrl = (url) => {
    if (!url || url === '/default-avatar.png') return '/default-avatar.png';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
  };

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/users/profile/${username}`);
      setProfileUser(response.data.user);
      setVideos(response.data.videos);
      setReplies(response.data.replies); // ✨ حفظ الردود
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

  useEffect(() => { fetchProfileData(); }, [fetchProfileData]);

  // ... (handleImageUpload, handleDeleteVideo, handleLogout تبقى كما هي)

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;
  if (!profileUser) return <div className="error-container"><p>المستخدم غير موجود</p></div>;

  let displayedContent;
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
    default:
      displayedContent = [];
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-main-info">
          <div className="profile-image-section">
            <label htmlFor="profile-image-input" className={`profile-image-wrapper ${isOwnProfile ? 'editable' : ''}`}>
              <img src={getAssetUrl(profileUser.profileImage)} alt={profileUser.username} className="profile-image"/>
              {isOwnProfile && <div className="edit-image-overlay"><FaCamera /><span>{uploadingImage ? 'جاري...' : 'تغيير'}</span></div>}
            </label>
            {isOwnProfile && <input type="file" id="profile-image-input" accept="image/*" onChange={handleImageUpload} hidden disabled={uploadingImage} />}
          </div>
          <div className="profile-details">
            <h1 className="profile-username">@{profileUser.username}</h1>
            <div className="profile-stats">
              <div className="stat-item"><span className="stat-value">{stats.videosCount}</span><span className="stat-label">منشور</span></div>
              <div className="stat-item"><span className="stat-value">{stats.repliesCount}</span><span className="stat-label">رد</span></div>
              <div className="stat-item"><span className="stat-value">{stats.totalLikes}</span><span className="stat-label">إعجاب</span></div>
            </div>
            {isOwnProfile && <button className="logout-btn" onClick={handleLogout}><FaSignOutAlt /> تسجيل الخروج</button>}
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button className={`tab ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}><FaFilm /><span>منشوراتي</span></button>
        {isOwnProfile && <button className={`tab ${activeTab === 'replies' ? 'active' : ''}`} onClick={() => setActiveTab('replies')}><FaReply /><span>ردودي</span></button>}
        {isOwnProfile && <button className={`tab ${activeTab === 'liked' ? 'active' : ''}`} onClick={() => setActiveTab('liked')}><FaHeart /><span>أعجبني</span></button>}
      </div>

      <div className="profile-content">
        <div className="videos-grid">
          {displayedContent.map((video) => (
            <div key={video._id} className="video-item">
              <Link to={`/video/${video._id}`} className="video-thumbnail">
                <video src={getAssetUrl(video.videoUrl)} muted onMouseEnter={(e) => e.target.play()} onMouseLeave={(e) => e.target.pause()} />
                <div className="video-stats-overlay">
                  <span><FaHeart /> {video.likes?.length || 0}</span>
                  <span><FaPlay /> {video.views || 0}</span>
                </div>
              </Link>
              {isOwnProfile && (activeTab === 'posts' || activeTab === 'replies') && (
                <button className="delete-video-btn" onClick={() => handleDeleteVideo(video._id)}><FaTrash /></button>
              )}
            </div>
          ))}
        </div>
        {displayedContent.length === 0 && (
          <div className="empty-state"><p>لا يوجد محتوى لعرضه هنا.</p></div>
        )}
      </div>
      <NavigationBar currentPage="profile" />
    </div>
  );
};

export default ProfilePage;