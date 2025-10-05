import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, EffectCoverflow, Pagination } from 'swiper';
import { 
  FaHeart, FaChevronLeft, FaChevronRight, FaPlay, FaPause,
  FaVolumeUp, FaVolumeMute, FaComment, FaShare
} from 'react-icons/fa';
import VideoPlayerSplit from './VideoPlayerSplit';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import './ReplySwiper.css';

const ReplySwiper = ({ 
  replies = [], 
  parentVideoOwner,
  activeIndex = 0,
  onLikeReply,
  onProfileClick,
  likedReplies = new Set(),
  isMuted = false,
  onMuteToggle,
  onReplyToReply,
  onShare
}) => {
  const [activeReplyIndex, setActiveReplyIndex] = useState(activeIndex);
  const [playingStates, setPlayingStates] = useState({});
  const swiperRef = useRef(null);
  const videoRefs = useRef({});

  // Update active index when prop changes
  useEffect(() => {
    setActiveReplyIndex(activeIndex);
    if (swiperRef.current && swiperRef.current.slideTo) {
      swiperRef.current.slideTo(activeIndex);
    }
  }, [activeIndex]);

  // Handle slide change
  const handleSlideChange = useCallback((swiper) => {
    const newIndex = swiper.activeIndex;
    setActiveReplyIndex(newIndex);
    
    // Pause all videos except the active one
    Object.keys(videoRefs.current).forEach(index => {
      if (parseInt(index) !== newIndex && videoRefs.current[index]) {
        videoRefs.current[index].pause();
      }
    });
    
    // Play the active video
    if (videoRefs.current[newIndex]) {
      videoRefs.current[newIndex].play();
    }
  }, []);

  // Toggle play/pause for current video
  const togglePlayPause = useCallback((index) => {
    if (videoRefs.current[index]) {
      const video = videoRefs.current[index];
      if (video.paused) {
        video.play();
        setPlayingStates(prev => ({ ...prev, [index]: true }));
      } else {
        video.pause();
        setPlayingStates(prev => ({ ...prev, [index]: false }));
      }
    }
  }, []);

  // Navigate to specific slide
  const goToSlide = useCallback((index) => {
    if (swiperRef.current && swiperRef.current.slideTo) {
      swiperRef.current.slideTo(index);
    }
  }, []);

  // Format numbers for display
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Get asset URL
  const getAssetUrl = (url) => {
    if (!url || url === '/default-avatar.png') return '/default-avatar.png';
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseUrl}${url}`;
  };

  if (!replies || replies.length === 0) {
    return (
      <div className="reply-swiper-empty">
        <div className="empty-icon">
          <FaComment />
        </div>
        <h3>لا توجد ردود بعد</h3>
        <p>كن أول من يرد على هذا الفيديو</p>
      </div>
    );
  }

  return (
    <div className="reply-swiper-container">
      {/* Header */}
      <div className="reply-header">
        <div className="reply-counter">
          <span className="reply-count">{replies.length}</span>
          <span className="reply-label">رد</span>
        </div>
        
        {/* Dots indicator */}
        <div className="reply-dots">
          {replies.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === activeReplyIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to reply ${index + 1}`}
            />
          ))}
        </div>

        {/* Mute button */}
        {onMuteToggle && (
          <button className="mute-btn" onClick={onMuteToggle}>
            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
          </button>
        )}
      </div>

      {/* Swiper */}
      <Swiper
        direction="horizontal"
        slidesPerView={1}
        spaceBetween={0}
        navigation={{
          prevEl: '.reply-nav-prev',
          nextEl: '.reply-nav-next',
        }}
        pagination={{
          el: '.reply-pagination',
          clickable: true,
          dynamicBullets: true,
        }}
        effect="slide"
        speed={400}
        modules={[Navigation, Pagination]}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        onSlideChange={handleSlideChange}
        className="reply-swiper"
      >
        {replies.map((reply, index) => (
          <SwiperSlide key={reply._id}>
            <div className="reply-slide">
              {/* Video Player */}
              <div className="reply-video-wrapper">
                <VideoPlayerSplit
                  videoUrl={reply.videoUrl}
                  isActive={index === activeReplyIndex}
                  autoPlay={index === activeReplyIndex}
                  showPlayButton={true}
                  muted={isMuted}
                  className="reply-video"
                  onPlayStateChange={(playing) => {
                    setPlayingStates(prev => ({ ...prev, [index]: playing }));
                  }}
                />

                {/* Play/Pause overlay button */}
                <button 
                  className="reply-play-btn"
                  onClick={() => togglePlayPause(index)}
                >
                  {playingStates[index] ? <FaPause /> : <FaPlay />}
                </button>

                {/* Gradient overlay */}
                <div className="reply-gradient-overlay"></div>
              </div>

              {/* Reply Info */}
              <div className="reply-info-overlay">
                {/* User info */}
                <div 
                  className="reply-user-info"
                  onClick={() => onProfileClick(reply.user.username)}
                >
                  <img 
                    src={getAssetUrl(reply.user.profileImage)} 
                    alt={reply.user.username}
                    className="reply-user-avatar"
                  />
                  <div className="reply-user-details">
                    <span className="reply-username">@{reply.user.username}</span>
                    {reply.user._id === parentVideoOwner?._id && (
                      <span className="creator-badge">المنشئ</span>
                    )}
                  </div>
                </div>

                {/* Reply description */}
                {reply.description && (
                  <p className="reply-description">{reply.description}</p>
                )}

                {/* Reply metadata */}
                <div className="reply-metadata">
                  <span className="reply-time">
                    {new Date(reply.createdAt).toLocaleDateString('ar-SA')}
                  </span>
                  {reply.views > 0 && (
                    <span className="reply-views">
                      {formatNumber(reply.views)} مشاهدة
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="reply-actions-sidebar">
                {/* Profile button */}
                <button 
                  className="reply-action-btn profile-btn"
                  onClick={() => onProfileClick(reply.user.username)}
                >
                  <img 
                    src={getAssetUrl(reply.user.profileImage)} 
                    alt={reply.user.username}
                  />
                </button>

                {/* Like button */}
                <button
                  className={`reply-action-btn ${likedReplies.has(reply._id) ? 'liked' : ''}`}
                  onClick={() => onLikeReply(reply._id)}
                >
                  <FaHeart />
                  <span>{formatNumber(reply.likes?.length || 0)}</span>
                </button>

                {/* Reply to reply button */}
                {onReplyToReply && (
                  <button
                    className="reply-action-btn"
                    onClick={() => onReplyToReply(reply._id)}
                  >
                    <FaComment />
                    <span>رد</span>
                  </button>
                )}

                {/* Share button */}
                {onShare && (
                  <button
                    className="reply-action-btn"
                    onClick={() => onShare(reply)}
                  >
                    <FaShare />
                    <span>مشاركة</span>
                  </button>
                )}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Navigation arrows */}
      {replies.length > 1 && (
        <>
          <button 
            className="reply-nav reply-nav-prev"
            aria-label="Previous reply"
          >
            <FaChevronRight />
          </button>
          <button 
            className="reply-nav reply-nav-next"
            aria-label="Next reply"
          >
            <FaChevronLeft />
          </button>
        </>
      )}

      {/* Bottom pagination */}
      <div className="reply-pagination"></div>
    </div>
  );
};

export default ReplySwiper;