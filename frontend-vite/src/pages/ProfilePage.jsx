import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaSignOutAlt, FaCamera, FaHeart, FaPlay, FaTrash } from 'react-icons/fa';
import axios from 'axios';
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
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);

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

    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة يجب أن يكون أقل من 5MB');
      return;
    }

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

  const handleDeleteVideo = async (video) => {
    try {
      await axios.delete(`/api/videos/${video._id}`);
      setVideos(videos.filter(v => v._id !== video._id));
      setShowDeleteConfirm(false);
      setVideoToDelete(null);
      alert('تم حذف الفيديو بنجاح');
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('فشل حذف الفيديو');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/default-avatar.png';
    if (imagePath.startsWith('http')) return imagePath;
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseURL}${imagePath}`;
  };

  const getVideoUrl = (videoPath) => {
    if (videoPath.startsWith('http')) return videoPath;
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseURL}${videoPath}`;
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  if (!profileData) {
    return <div className="error">المستخدم غير موجود</div>;
  }

  return (
    <div className="profile-page">
      {/* Header Section */}
      <div className="profile-header">
        <div className="profile-cover"></div>
        
        <div className="profile-main-info">
          <div className="profile-image-section">
            <div className="profile-image-wrapper">
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
                  <FaCamera />
                </button>
              )}
            </div>
          </div>

          <div className="profile-details">
            <h1 className="profile-username">@{profileData.username}</h1>
            
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-value">{videos.length}</span>
                <span className="stat-label">فيديو</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-value">{profileData.totalLikes || 0}</span>
                <span className="stat-label">إعجاب</span>
              </div>
            </div>

            {isOwnProfile && (
              <button className="logout-btn" onClick={handleLogout}>
                <FaSignOutAlt />
                <span>تسجيل الخروج</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      {isOwnProfile && (
        <div className="profile-tabs">
          <button 
            className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <FaPlay />
            <span>منشوراتي</span>
          </button>
          <button 
            className={`tab ${activeTab === 'liked' ? 'active' : ''}`}
            onClick={() => setActiveTab('liked')}
          >
            <FaHeart />
            <span>إعجاباتي</span>
          </button>
        </div>
      )}

      {/* Videos Grid */}
      <div className="profile-content">
        {!isOwnProfile && (
          <h2 className="content-title">فيديوهات @{profileData.username}</h2>
        )}
        
        <div className="videos-grid">
          {(activeTab === 'posts' ? videos : likedVideos).map((video) => (
            <div key={video._id} className="video-item">
              <div 
                className="video-thumbnail"
                onClick={() => navigate(`/?video=${video._id}`)}
              >
                <video 
                  src={getVideoUrl(video.videoUrl)}
                  muted
                  onMouseEnter={(e) => e.target.play()}
                  onMouseLeave={(e) => {
                    e.target.pause();
                    e.target.currentTime = 0;
                  }}
                />
                <div className="video-overlay">
                  <FaPlay className="play-icon" />
                </div>
                <div className="video-stats-overlay">
                  <span>
                    <FaHeart /> {video.likes?.length || 0}
                  </span>
                  <span>
                    <FaPlay /> {video.views || 0}
                  </span>
                </div>
              </div>
              
              {isOwnProfile && activeTab === 'posts' && (
                <button 
                  className="delete-video-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoToDelete(video);
                    setShowDeleteConfirm(true);
                  }}
                >
                  <FaTrash />
                </button>
              )}
            </div>
          ))}
        </div>

        {((activeTab === 'posts' && videos.length === 0) || 
          (activeTab === 'liked' && likedVideos.length === 0)) && (
          <div className="empty-state">
            <p>{activeTab === 'posts' ? 'لا توجد فيديوهات' : 'لا توجد إعجابات'}</p>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && videoToDelete && (
        <div className="delete-confirm-modal">
          <div className="confirm-dialog">
            <h3>تأكيد الحذف</h3>
            <p>هل أنت متأكد من حذف هذا الفيديو؟</p>
            {!videoToDelete.isReply && videoToDelete.replies?.length > 0 && (
              <p className="warning-text">
                سيتم حذف {videoToDelete.replies.length} رد مع هذا الفيديو
              </p>
            )}
            <div className="confirm-buttons">
              <button 
                onClick={() => handleDeleteVideo(videoToDelete)} 
                className="btn btn-danger"
              >
                نعم، احذف
              </button>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setVideoToDelete(null);
                }} 
                className="btn btn-secondary"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
      <NavigationBar currentPage="profile" />
    </div>
  );
};

export default ProfilePage;
