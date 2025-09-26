import React, { useRef, useEffect, useState } from 'react';
import { FaHeart, FaPlus, FaTrash, FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VideoPlayer.css';

const VideoPlayer = ({ video, onReply, onDelete, isActive, parentVideoOwner, onVideoClick }) => {
  const videoRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(video.likes?.length || 0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    if (user && video.likes) {
      setLiked(video.likes.includes(user.id));
    }
  }, [user, video.likes]);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        // تشغيل الفيديو النشط
        videoRef.current.play().catch(err => console.log('Play error:', err));
        // تسجيل المشاهدة
        axios.post(`/api/videos/${video._id}/view`).catch(err => console.log('View error:', err));
      } else {
        // إيقاف الفيديو غير النشط وكتم صوته
        videoRef.current.pause();
        videoRef.current.currentTime = 0; // إعادة الفيديو للبداية
      }
    }
  }, [isActive, video._id]);

  // تنظيف عند إلغاء المكون
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const handleVideoClick = () => {
    // إظهار/إخفاء الكنترولز
    setShowControls(true);
    
    // استدعاء callback من الـ parent
    if (onVideoClick && typeof onVideoClick === 'function') {
      onVideoClick();
    }
    
    // إلغاء المؤقت السابق
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // إخفاء الكنترولز بعد 3 ثواني
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    // تشغيل/إيقاف الفيديو
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) {
      alert('يجب تسجيل الدخول للإعجاب');
      navigate('/login');
      return;
    }

    try {
      const response = await axios.post(`/api/videos/${video._id}/like`);
      setLiked(response.data.liked);
      setLikesCount(response.data.likesCount);
    } catch (error) {
      console.error('Error liking video:', error);
    }
  };

  const handleReply = (e) => {
    e.stopPropagation();
    if (!user) {
      alert('يجب تسجيل الدخول للرد');
      navigate('/login');
      return;
    }
    if (onReply) {
      onReply(video._id);
    }
  };

  const handleDelete = async () => {
    try {
      if (video.isReply) {
        await axios.delete(`/api/videos/reply/${video._id}`);
      } else {
        await axios.delete(`/api/videos/${video._id}`);
      }
      onDelete(video._id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('فشل حذف الفيديو');
    }
  };

const canDelete = user && (
  video.user._id === user.id || // صاحب الفيديو يمكنه حذف فيديوه
  (video.isReply && parentVideoOwner === user.id) // صاحب الفيديو الأساسي يمكنه حذف أي رد
);

  const handleUserClick = (e) => {
    e.stopPropagation();
    navigate(`/profile/${video.user.username}`);
  };

  const getVideoUrl = () => {
    if (video.videoUrl.startsWith('http')) {
      return video.videoUrl;
    }
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseURL}${video.videoUrl}`;
  };

  const getProfileImageUrl = () => {
    if (!video.user.profileImage) return '/default-avatar.png';
    if (video.user.profileImage.startsWith('http')) return video.user.profileImage;
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseURL}${video.user.profileImage}`;
  };

  return (
    <div className="video-player" onClick={handleVideoClick}>
      <video
        ref={videoRef}
        src={getVideoUrl()}
        loop
        playsInline
        className="video-element"
        muted={isMuted}
      />

      {/* Controls - تظهر فقط عند النقر */}
      <div className={`video-overlay ${showControls ? 'show' : ''}`}>
        {/* معلومات المستخدم */}
        <div className="video-info">
          <div className="user-info" onClick={handleUserClick}>
            <img 
              src={getProfileImageUrl()} 
              alt={video.user.username}
              className="user-avatar"
              onError={(e) => {
                e.target.src = '/default-avatar.png';
              }}
            />
            <span className="username">@{video.user.username}</span>
          </div>
          {video.description && (
            <p className="description">{video.description}</p>
          )}
          <div className="video-stats">
            <span>{video.views || 0} مشاهدة</span>
          </div>
        </div>

        {/* أزرار التفاعل */}
        <div className="video-actions">
          <button 
            className={`action-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <FaHeart />
            <span>{likesCount}</span>
          </button>

          {!video.isReply && (
            <button 
              className="action-btn"
              onClick={handleReply}
            >
              <FaPlus />
              <span>رد</span>
            </button>
          )}

{canDelete && (
  <button 
    className="action-btn delete-btn"
    onClick={(e) => {
      e.stopPropagation();
      setShowDeleteConfirm(true);
    }}
  >
    <FaTrash />
    <span>حذف</span>
  </button>
)}

          <button 
            className="action-btn mute-btn"
            onClick={toggleMute}
          >
            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
          </button>
        </div>
      </div>

      {/* تأكيد الحذف */}
      {showDeleteConfirm && (
        <div className="delete-confirm" onClick={(e) => e.stopPropagation()}>
          <div className="confirm-dialog">
            <p>هل أنت متأكد من حذف هذا الفيديو؟</p>
            <div className="confirm-buttons">
              <button onClick={handleDelete} className="btn btn-danger">
                نعم، احذف
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                className="btn btn-secondary"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
