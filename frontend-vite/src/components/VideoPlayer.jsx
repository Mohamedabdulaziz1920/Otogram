import React, { useRef, useEffect, useState } from 'react';
import { FaHeart, FaPlus, FaTrash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VideoPlayer.css';

const VideoPlayer = ({ video, onReply, onDelete, isActive, parentVideoOwner }) => {
  const videoRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(video.likes?.length || 0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user && video.likes) {
      setLiked(video.likes.includes(user.id));
    }
  }, [user, video.likes]);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(err => console.log('Play error:', err));
        // تسجيل المشاهدة
        axios.post(`/api/videos/${video._id}/view`).catch(err => console.log('View error:', err));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive, video._id]);

  const handleLike = async () => {
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

  const handleReply = () => {
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

  // تحديد صلاحيات الحذف
  const canDelete = user && (
    // صاحب الفيديو يمكنه حذف فيديوه
    video.user._id === user.id || 
    // صاحب الفيديو الأساسي يمكنه حذف أي رد
    (video.isReply && parentVideoOwner === user.id)
  );

  const handleUserClick = () => {
    navigate(`/profile/${video.user.username}`);
  };

  const getVideoUrl = () => {
    if (video.videoUrl.startsWith('http')) {
      return video.videoUrl;
    }
    return `http://localhost:5000${video.videoUrl}`;
  };

  const getProfileImageUrl = () => {
    if (!video.user.profileImage) return '/default-avatar.png';
    if (video.user.profileImage.startsWith('http')) return video.user.profileImage;
    return `http://localhost:5000${video.user.profileImage}`;
  };

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        src={getVideoUrl()}
        loop
        muted
        playsInline
        onClick={(e) => {
          if (videoRef.current.paused) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
        }}
      />

      <div className="video-info">
        <div 
          className="user-info"
          onClick={handleUserClick}
        >
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
            onClick={() => setShowDeleteConfirm(true)}
          >
            <FaTrash />
            <span>حذف</span>
          </button>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirm">
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