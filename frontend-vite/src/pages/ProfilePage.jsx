import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { FaSignOutAlt, FaCamera, FaFilm, FaReply, FaHeart } from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import './ProfilePage.css';

const ProfilePage = () => {
  const { username } = useParams();
  const { user, logout, updateUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
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
    if (!username) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/users/profile/${username}`);
      setProfileData(response.data);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setProfileData(null);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (!authLoading) {
        fetchProfileData();
    }
  }, [authLoading, username, fetchProfileData]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profileImage', file);
    setUploadingImage(true);

    try {
      // لا حاجة لإضافة التوكن يدويًا، `api` context يقوم بذلك
      const response = await api.post('/api/users/me/update-profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // تحديث الحالة المحلية والمصادقة
      const newImageUrl = response.data.profileImage;
      setProfileData(prev => ({ ...prev, user: { ...prev.user, profileImage: newImageUrl } }));
      updateUser({ profileImage: newImageUrl });
    } catch (error) {
      console.error(error);
      alert('فشل تحديث الصورة: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploadingImage(false);
    }
  };

  if (authLoading || loading) {
    return <div className="loading-container"><div className="loading-spinner"></div><p>جاري التحميل...</p></div>;
  }
  if (!profileData || !profileData.user) {
    return <div className="error-container"><h2>المستخدم غير موجود</h2><button onClick={() => navigate('/')}>العودة للرئيسية</button></div>;
  }
  
  const { user: profileUser, videos, replies, stats } = profileData;

  const displayedContent = activeTab === 'posts' ? videos : replies;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-image-container">
          <img src={getAssetUrl(profileUser.profileImage)} alt={profileUser.username} className="profile-image" />
          {isOwnProfile && (
            <label htmlFor="profile-image-input" className="edit-image-label">
              <FaCamera />
              <input id="profile-image-input" type="file" accept="image/*" onChange={handleImageUpload} hidden disabled={uploadingImage} />
            </label>
          )}
          {uploadingImage && <div className="image-upload-spinner"></div>}
        </div>

        <h1 className="profile-username">@{profileUser.username}</h1>

        <div className="profile-stats">
          <div className="stat-item"><strong>{stats.videosCount}</strong><span>منشورات</span></div>
          <div className="stat-item"><strong>{stats.repliesCount}</strong><span>ردود</span></div>
          <div className="stat-item"><strong>{stats.totalLikes}</strong><span>إعجابات</span></div>
        </div>

        {isOwnProfile && <button className="logout-button" onClick={logout}><FaSignOutAlt /> تسجيل الخروج</button>}
      </div>

      <div className="profile-tabs">
        <button className={`tab ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}><FaFilm /><span>المنشورات</span></button>
        <button className={`tab ${activeTab === 'replies' ? 'active' : ''}`} onClick={() => setActiveTab('replies')}><FaReply /><span>الردود</span></button>
      </div>

      <div className="profile-content">
        {displayedContent.length > 0 ? (
          <div className="videos-grid">
            {displayedContent.map(item => (
              <div key={item._id} className="video-item" onClick={() => navigate(`/video/${item._id}`)}>
                <video src={getAssetUrl(item.videoUrl)} muted />
                <div className="video-item-overlay">
                  <FaHeart /> {item.likes?.length || 0}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state"><p>لا يوجد محتوى لعرضه هنا.</p></div>
        )}
      </div>
      <NavigationBar currentPage="profile" />
    </div>
  );
};

export default ProfilePage;
