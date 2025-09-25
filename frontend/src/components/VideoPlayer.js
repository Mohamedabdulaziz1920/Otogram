import React, { useRef, useEffect, useState } from 'react';
import { FaHeart, FaPlus, FaTrash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './VideoPlayer.css';

const VideoPlayer = ({ video, onReply, onDelete, isActive }) => {
  const videoRef = useRef(null);
  const { user } = useAuth();
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
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive]);

  const handleLike = async () => {
    if (!user) {
      alert('يجب تسجيل الدخول للإعجاب');
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

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/videos/${video._id}`);
      onDelete(video._id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('فشل حذف الفيديو');
    }
  };

  const canDelete = user && (
    video.user._id === user.id || 
    (!video.isReply && video.user._id === user.id)
  );

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        src={`http://localhost:5000${video.videoUrl}`}
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
        <div className="user-info">
          <img 
            src={video.user.profileImage || '/default-avatar.png'} 
            alt={video.user.username}
            className="user-avatar"
          />
          <span className="username">@{video.user.username}</span>
        </div>
        {video.description && (
          <p className="description">{video.description}</p>
        )}
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
            onClick={() => onReply(video._id)}
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