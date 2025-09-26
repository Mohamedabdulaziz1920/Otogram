import React, { useState } from 'react';
import { FaTimes, FaPlay, FaTrash } from 'react-icons/fa';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper';
import VideoPlayer from './VideoPlayer';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import 'swiper/css';
import 'swiper/css/navigation';
import './RepliesSection.css';

const RepliesSection = ({ replies, parentVideo, parentVideoOwner, onDelete, onClose }) => {
  const [selectedReply, setSelectedReply] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState(null); // 'reply' or 'main'
  const [replyToDelete, setReplyToDelete] = useState(null);
  const { user } = useAuth();

  const handleReplyClick = (reply) => {
    setSelectedReply(reply);
  };

  const handleCloseFullscreen = () => {
    setSelectedReply(null);
  };

  const getVideoUrl = (video) => {
    if (video.videoUrl.startsWith('http')) {
      return video.videoUrl;
    }
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseURL}${video.videoUrl}`;
  };

  const getProfileImageUrl = (user) => {
    if (!user.profileImage) return '/default-avatar.png';
    if (user.profileImage.startsWith('http')) return user.profileImage;
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseURL}${user.profileImage}`;
  };

  // حذف رد
  const handleDeleteReply = async (reply) => {
    try {
      await axios.delete(`/api/videos/reply/${reply._id}`);
      onDelete(reply._id);
      if (selectedReply && selectedReply._id === reply._id) {
        handleCloseFullscreen();
      }
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting reply:', error);
      alert('فشل حذف الرد');
    }
  };

  // حذف الفيديو الأساسي مع جميع الردود
  const handleDeleteMainVideo = async () => {
    try {
      await axios.delete(`/api/videos/${parentVideo._id}`);
      onDelete(parentVideo._id);
      onClose();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting main video:', error);
      alert('فشل حذف الفيديو');
    }
  };

  const confirmDelete = () => {
    if (deleteType === 'reply' && replyToDelete) {
      handleDeleteReply(replyToDelete);
    } else if (deleteType === 'main') {
      handleDeleteMainVideo();
    }
  };

  // التحقق من صلاحيات الحذف
  const canDeleteReply = (reply) => {
    return user && (
      reply.user._id === user.id || // صاحب الرد
      parentVideoOwner === user.id   // صاحب الفيديو الأساسي
    );
  };

  const canDeleteMainVideo = () => {
    return user && parentVideo.user._id === user.id;
  };

  return (
    <>
      <div className="replies-section">
        <div className="replies-header">
          <h3>الردود ({replies.length})</h3>
          <div className="header-actions">
            {canDeleteMainVideo() && (
              <button 
                className="delete-main-btn"
                onClick={() => {
                  setDeleteType('main');
                  setShowDeleteConfirm(true);
                }}
                title="حذف الفيديو الأساسي وجميع الردود"
              >
                <FaTrash />
                <span>حذف الكل</span>
              </button>
            )}
            <button className="close-replies" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
        </div>
        
        <div className="replies-slider">
          <Swiper
            spaceBetween={10}
            slidesPerView={2.5}
            navigation={true}
            modules={[Navigation]}
            breakpoints={{
              320: {
                slidesPerView: 2,
                spaceBetween: 8
              },
              480: {
                slidesPerView: 2.5,
                spaceBetween: 10
              },
              640: {
                slidesPerView: 3,
                spaceBetween: 10
              },
              768: {
                slidesPerView: 3.5,
                spaceBetween: 12
              }
            }}
            className="replies-swiper"
          >
            {replies.map((reply) => (
              <SwiperSlide key={reply._id}>
                <div className="reply-thumbnail-wrapper">
                  <div 
                    className="reply-thumbnail"
                    onClick={() => handleReplyClick(reply)}
                  >
                    <video 
                      src={getVideoUrl(reply)}
                      muted
                      loop
                      onMouseEnter={(e) => e.target.play()}
                      onMouseLeave={(e) => e.target.pause()}
                    />
                    <div className="reply-overlay">
                      <FaPlay className="play-icon" />
                    </div>
                    <div className="reply-info">
                      <img 
                        src={getProfileImageUrl(reply.user)} 
                        alt={reply.user.username}
                        className="reply-user-avatar"
                      />
                      <span>@{reply.user.username}</span>
                    </div>
                  </div>
                  {canDeleteReply(reply) && (
                    <button 
                      className="delete-reply-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplyToDelete(reply);
                        setDeleteType('reply');
                        setShowDeleteConfirm(true);
                      }}
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      {/* عرض الرد بملء الشاشة */}
      {selectedReply && (
        <div className="fullscreen-reply">
          <div className="fullscreen-header">
            <button className="close-fullscreen" onClick={handleCloseFullscreen}>
              <FaTimes />
            </button>
            {canDeleteReply(selectedReply) && (
              <button 
                className="delete-fullscreen-btn"
                onClick={() => {
                  setReplyToDelete(selectedReply);
                  setDeleteType('reply');
                  setShowDeleteConfirm(true);
                }}
              >
                <FaTrash />
                <span>حذف الرد</span>
              </button>
            )}
          </div>
          <VideoPlayer
            video={selectedReply}
            onDelete={(videoId) => {
              onDelete(videoId);
              handleCloseFullscreen();
            }}
            isActive={true}
            parentVideoOwner={parentVideoOwner}
            isReply={true}
          />
        </div>
      )}

      {/* تأكيد الحذف */}
      {showDeleteConfirm && (
        <div className="delete-confirm-modal">
          <div className="confirm-dialog">
            <h3>تأكيد الحذف</h3>
            <p>
              {deleteType === 'main' 
                ? 'هل أنت متأكد من حذف الفيديو الأساسي وجميع الردود؟'
                : 'هل أنت متأكد من حذف هذا الرد؟'
              }
            </p>
            <div className="confirm-buttons">
              <button onClick={confirmDelete} className="btn btn-danger">
                نعم، احذف
              </button>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setReplyToDelete(null);
                  setDeleteType(null);
                }} 
                className="btn btn-secondary"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RepliesSection;
