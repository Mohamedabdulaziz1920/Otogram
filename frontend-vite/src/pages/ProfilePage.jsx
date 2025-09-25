import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import VideoGrid from '../components/VideoGrid';
import './ProfilePage.css';
import NavigationBar from '../components/NavigationBar';
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
  const [uploadingImage, setUploadingImage] = useState(false);

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
      
      // فقط إذا كان الملف الشخصي للمستخدم نفسه
      if (isOwnProfile) {
        try {
          const likedRes = await axios.get('/api/users/liked-videos');
          setLikedVideos(likedRes.data);
        } catch (error) {
          console.error('Error fetching liked videos:', error);
          setLikedVideos([]);
        }
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

    // التحقق من حجم الملف
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة يجب أن يكون أقل من 5MB');
      return;
    }

    // التحقق من نوع الملف
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('يُسمح فقط بملفات JPG, PNG, GIF');
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      const response = await axios.post('/api/users/update-profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // تحديث الصورة في الواجهة
      setProfileData({ 
        ...profileData, 
        profileImage: response.data.profileImage 
      });
      
      setIsEditingProfile(false);
      alert('تم تحديث الصورة بنجاح');
    } catch (error) {
      console.error('Error updating profile image:', error);
      alert('فشل تحديث الصورة: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/default-avatar.png';
    if (imagePath.startsWith('http')) return imagePath;
    return `http://localhost:5000${imagePath}`;
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
              src={getImageUrl(profileData.profileImage)} 
              alt={profileData.username}
              className="profile-image"
              onError={(e) => {
                e.target.src = '/default-avatar.png';
              }}
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
      </div>

      {/* عرض التبويبات فقط للمستخدم نفسه */}
      {isOwnProfile ? (
        <>
          <div className="profile-tabs">
            <button 
              className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              منشوراتي
            </button>
            <button 
              className={`tab ${activeTab === 'liked' ? 'active' : ''}`}
              onClick={() => setActiveTab('liked')}
            >
              إعجاباتي
            </button>
          </div>
          <div className="profile-content">
            {activeTab === 'posts' ? (
              <VideoGrid videos={videos} />
            ) : (
              <VideoGrid videos={likedVideos} />
            )}
          </div>
        </>
      ) : (
        // عرض منشورات المستخدم فقط للزوار
        <div className="profile-content">
          <h3 className="videos-title">منشورات @{profileData.username}</h3>
          <VideoGrid videos={videos} />
        </div>
      )}

      {isEditingProfile && (
        <div className="edit-profile-modal">
          <div className="modal-content">
            <h3>تغيير الصورة الشخصية</h3>
            <div className="upload-info">
              <small>الحد الأقصى لحجم الصورة: 5MB</small>
              <small>الصيغ المدعومة: JPG, PNG, GIF</small>
            </div>
            <input 
              type="file" 
              accept="image/jpeg,image/jpg,image/png,image/gif" 
              onChange={handleImageUpload}
              id="profile-image-input"
              disabled={uploadingImage}
            />
            <label 
              htmlFor="profile-image-input" 
              className={`btn btn-primary ${uploadingImage ? 'disabled' : ''}`}
            >
              {uploadingImage ? 'جاري الرفع...' : 'اختر صورة'}
            </label>
            <button 
              className="btn btn-secondary"
              onClick={() => setIsEditingProfile(false)}
              disabled={uploadingImage}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
          {isEditingProfile && (
        <div className="edit-profile-modal">
          {/* محتوى Modal */}
        </div>
      )}
      
      <NavigationBar currentPage="profile" />
    </div>

  );
};

export default ProfilePage;