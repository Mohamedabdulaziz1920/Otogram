import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  FaTimes, FaPlay, FaTrash, FaHeart, FaComment, 
  FaShare, FaEllipsisV, FaChevronLeft, FaChevronRight,
  FaPause, FaVolumeUp, FaVolumeMute, FaExpand
} from 'react-icons/fa';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode } from 'swiper';
import VideoPlayer from './VideoPlayer';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';
import './RepliesSection.css';

const RepliesSection = ({ 
  replies = [], 
  parentVideo, 
  parentVideoOwner, 
  onDelete, 
  onClose,
  onLikeReply,
  onReplyToReply,
  likedReplies = new Set()
}) => {
  const [selectedReply, setSelectedReply] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [replyToDelete, setReplyToDelete] = useState(null);
  const [playingVideos, setPlayingVideos] = useState({});
  const [showMoreMenu, setShowMoreMenu] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [expandedView, setExpandedView] = useState(false);
  
  const { user } = useAuth();
  const swiperRef = useRef(null);
  const videoRefs = useRef({});

  // Handle reply selection
  const handleReplyClick = useCallback((reply) => {
    setSelectedReply(reply);
    setExpandedView(true);
  }, []);

  // Close fullscreen
  const handleCloseFullscreen = useCallback(() => {
    setSelectedReply(null);
    setExpandedView(false);
  }, []);

  // Get URLs
  const getVideoUrl = useCallback((video) => {
    if (!video?.videoUrl) return '';
    if (video.videoUrl.startsWith('http')) return video.videoUrl;
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseURL}${video.videoUrl}`;
  }, []);

  const getProfileImageUrl = useCallback((user) => {
    if (!user?.profileImage || user.profileImage === '/default-avatar.png') {
      return '/default-avatar.png';
    }
    if (user.profileImage.startsWith('http')) return user.profileImage;
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseURL}${user.profileImage}`;
  }, []);

  // Delete reply
  const handleDeleteReply = async (reply) => {
    try {
      await api.delete(`/api/videos/reply/${reply._id}`);
      onDelete(reply._id);
      if (selectedReply && selectedReply._id === reply._id) {
        handleCloseFullscreen();
      }
      setShowDeleteConfirm(false);
      setReplyToDelete(null);
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };

  // Delete main video
  const handleDeleteMainVideo = async () => {
    try {
      await api.delete(`/api/videos/${parentVideo._id}`);
      onDelete(parentVideo._id);
      onClose();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting main video:', error);
    }
  };

  // Confirm delete
  const confirmDelete = useCallback(() => {
    if (deleteType === 'reply' && replyToDelete) {
      handleDeleteReply(replyToDelete);
    } else if (deleteType === 'main') {
      handleDeleteMainVideo();
    }
  }, [deleteType, replyToDelete]);

  // Check permissions
  const canDeleteReply = useCallback((reply) => {
    return user && (
      reply.user._id === user.id ||
      reply.user._id === user._id ||
      parentVideoOwner === user.id ||
      parentVideoOwner === user._id
    );
  }, [user, parentVideoOwner]);

  const canDeleteMainVideo = useCallback(() => {
    return user && (
      parentVideo.user._id === user.id ||
      parentVideo.user._id === user._id
    );
  }, [user, parentVideo]);

  // Toggle video play/pause
  const toggleVideoPlay = useCallback((replyId) => {
    const video = videoRefs.current[replyId];
    if (video) {
      if (video.paused) {
        video.play();
        setPlayingVideos(prev => ({ ...prev, [replyId]: true }));
      } else {
        video.pause();
        setPlayingVideos(prev => ({ ...prev, [replyId]: false }));
      }
    }
  }, []);

  // Handle share
  const handleShare = useCallback(async (reply) => {
    const shareUrl = `${window.location.origin}/video/${reply._id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `رد من @${reply.user.username}`,
          text: reply.description || '',
          url: shareUrl
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      // Show toast notification
    }
  }, []);

  // Format numbers
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedReply) {
          handleCloseFullscreen();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedReply, onClose, handleCloseFullscreen]);

  return (
    <>
      <div className={`replies-section ${expandedView ? 'expanded' : ''}`}>
        {/* Header */}
        <div className="replies-header">
          <div className="header-left">
            <h3>
              <FaComment className="header-icon" />
              <span>الردود</span>
              <span className="replies-count">{replies.length}</span>
            </h3>
          </div>
          
          <div className="header-actions">
            {canDeleteMainVideo() && (
              <button 
                className="action-btn delete-all-btn"
                onClick={() => {
                  setDeleteType('main');
                  setShowDeleteConfirm(true);
                }}
                title="حذف الفيديو وجميع الردود"
              >
                <FaTrash />
              </button>
            )}
            
            <button 
              className="action-btn mute-btn"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
            >
              {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
            
            <button className="close-replies" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Drag handle */}
        <div className="drag-handle">
          <span></span>
        </div>
        
        {/* Replies carousel */}
        <div className="replies-container">
          {replies.length > 0 ? (
            <Swiper
              ref={swiperRef}
              spaceBetween={12}
              slidesPerView="auto"
              freeMode={true}
              navigation={{
                prevEl: '.replies-nav-prev',
                nextEl: '.replies-nav-next',
              }}
              modules={[Navigation, FreeMode]}
              className="replies-swiper"
            >
              {replies.map((reply) => (
                <SwiperSlide key={reply._id} className="reply-slide">
                  <div className="reply-card">
                    {/* Video thumbnail */}
                    <div 
                      className="reply-thumbnail"
                      onClick={() => handleReplyClick(reply)}
                    >
                      <video 
                        ref={el => videoRefs.current[reply._id] = el}
                        src={getVideoUrl(reply)}
                        muted={isMuted}
                        loop
                        playsInline
                        onMouseEnter={(e) => {
                          e.target.play();
                          setPlayingVideos(prev => ({ ...prev, [reply._id]: true }));
                        }}
                        onMouseLeave={(e) => {
                          e.target.pause();
                          e.target.currentTime = 0;
                          setPlayingVideos(prev => ({ ...prev, [reply._id]: false }));
                        }}
                      />
                      
                      {/* Play/Pause overlay */}
                      <div className="video-overlay">
                        <button 
                          className="play-pause-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVideoPlay(reply._id);
                          }}
                        >
                          {playingVideos[reply._id] ? <FaPause /> : <FaPlay />}
                        </button>
                      </div>

                      {/* Expand button */}
                      <button 
                        className="expand-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReplyClick(reply);
                        }}
                      >
                        <FaExpand />
                      </button>
                    </div>

                    {/* User info */}
                    <div className="reply-user-info">
                      <img 
                        src={getProfileImageUrl(reply.user)} 
                        alt={reply.user.username}
                        className="reply-avatar"
                      />
                      <div className="reply-user-details">
                        <span className="reply-username">@{reply.user.username}</span>
                        {reply.user._id === parentVideoOwner && (
                          <span className="creator-badge">المنشئ</span>
                        )}
                      </div>
                    </div>

                    {/* Reply stats */}
                    <div className="reply-stats">
                      <div className="stat-item">
                        <FaHeart className={likedReplies.has(reply._id) ? 'liked' : ''} />
                        <span>{formatNumber(reply.likes?.length || 0)}</span>
                      </div>
                      <div className="stat-item">
                        <FaComment />
                        <span>{formatNumber(reply.replies?.length || 0)}</span>
                      </div>
                    </div>

                    {/* Action menu */}
                    <div className="reply-actions">
                      <button 
                        className="action-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMoreMenu(showMoreMenu === reply._id ? null : reply._id);
                        }}
                      >
                        <FaEllipsisV />
                      </button>
                      
                      {showMoreMenu === reply._id && (
                        <div className="action-menu">
                          {onLikeReply && (
                            <button onClick={() => onLikeReply(reply._id)}>
                              <FaHeart /> إعجاب
                            </button>
                          )}
                          {onReplyToReply && (
                            <button onClick={() => onReplyToReply(reply._id)}>
                              <FaComment /> رد
                            </button>
                          )}
                          <button onClick={() => handleShare(reply)}>
                            <FaShare /> مشاركة
                          </button>
                          {canDeleteReply(reply) && (
                            <button 
                              className="danger"
                              onClick={() => {
                                setReplyToDelete(reply);
                                setDeleteType('reply');
                                setShowDeleteConfirm(true);
                                setShowMoreMenu(null);
                              }}
                            >
                              <FaTrash /> حذف
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className="no-replies">
              <FaComment />
              <p>لا توجد ردود بعد</p>
              <span>كن أول من يرد على هذا الفيديو</span>
            </div>
          )}

          {/* Navigation arrows */}
          {replies.length > 3 && (
            <>
              <button className="replies-nav replies-nav-prev">
                <FaChevronRight />
              </button>
              <button className="replies-nav replies-nav-next">
                <FaChevronLeft />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Fullscreen reply view */}
      {selectedReply && (
        <div className="fullscreen-reply">
          <div className="fullscreen-header">
            <button className="close-fullscreen" onClick={handleCloseFullscreen}>
              <FaTimes />
            </button>
            
            <div className="fullscreen-actions">
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
                </button>
              )}
              
              <button 
                className="share-fullscreen-btn"
                onClick={() => handleShare(selectedReply)}
              >
                <FaShare />
              </button>
            </div>
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

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="delete-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">
              <FaTrash />
            </div>
            
            <h3>تأكيد الحذف</h3>
            
            <p>
              {deleteType === 'main' 
                ? 'سيتم حذف الفيديو الأساسي وجميع الردود المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.'
                : 'سيتم حذف هذا الرد نهائياً. هل أنت متأكد؟'
              }
            </p>
            
            <div className="modal-actions">
              <button onClick={confirmDelete} className="btn-danger">
                <FaTrash /> حذف نهائياً
              </button>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setReplyToDelete(null);
                  setDeleteType(null);
                }} 
                className="btn-cancel"
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