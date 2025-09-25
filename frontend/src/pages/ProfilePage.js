import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import VideoGrid from '../components/VideoGrid';
import './ProfilePage.css';

const ProfilePage = () => {
  const { username } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [videos, setVideos] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  const isOwnProfile = user && user.username === username;

  useEffect(() => {
    fetchProfileData();
  }, [username]);

  const fetchProfileData = async () => {
    try {
      const profileRes = await axios.get(`/api/users/profile/${username}`);
      setProfileData(profileRes.data);
      
      const videosRes = await axios.get(`/api/users/${username}/videos`);
      setVideos(videosRes.data);
      
      if (isOwnProfile) {
        const likedRes = await axios.get('/api/users/liked-videos');
        setLikedVideos(likedRes.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      const response = await axios.post('/api/users/update-profile-image', formData);
      setProfileData({ ...profileData, profileImage: response.data.profileImage });
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile image:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  if (!profileData) {
    return <div className="error">المستخدم غير موجود</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-info">
          <div className="profile-image-container">
            <img 
              src={profileData.profileImage || '/default-avatar.png'} 
              alt={profileData.username}
              className="profile-image"
            />
            {isOwnProfile && (
              <button 
                className="edit-image-btn"
                onClick={() => setIsEditingProfile(true)}
              >
                تعديل
              </button>
            )}
          </div>
          
          <h2>@{profileData.username}</h2>
          
          {isOwnProfile && (
            <div className="profile-actions">
              <button className="btn btn-secondary" onClick={handleLogout}>
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>

        <div className="profile-stats">
          <div className="stat">
            <span className="stat-value">{videos.length}</span>
            <span className="stat-label">فيديو</span>
          </div>
          <div className="stat">
            <span className="stat-value">{profileData.totalLikes || 0}</span>
            <span className="stat-label">إعجاب</span>
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button 
          className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          منشوراتي
        </button>
        {isOwnProfile && (
          <button 
            className={`tab ${activeTab === 'liked' ? 'active' : ''}`}
            onClick={() => setActiveTab('liked')}
          >
            إعجاباتي
          </button>
        )}
      </div>

      <div className="profile-content">
        {activeTab === 'posts' && (
          <VideoGrid videos={videos} />
        )}
        {activeTab === 'liked' && isOwnProfile && (
          <VideoGrid videos={likedVideos} />
        )}
      </div>

      {isEditingProfile && (
        <div className="edit-profile-modal">
          <div className="modal-content">
            <h3>تغيير الصورة الشخصية</h3>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              id="profile-image-input"
            />
            <label htmlFor="profile-image-input" className="btn btn-primary">
              اختر صورة
            </label>
            <button 
              className="btn btn-secondary"
              onClick={() => setIsEditingProfile(false)}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;