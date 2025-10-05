import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard, Navigation } from 'swiper';
import { 
  FaHeart, FaComment, FaShare, FaChevronLeft, FaChevronRight,
  FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaBookmark
} from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';

import 'swiper/css';
import 'swiper/css/navigation';
import './HomePage.css';

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [activeReplyIndex, setActiveReplyIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [likedReplies, setLikedReplies] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [isMainPlaying, setIsMainPlaying] = useState(true);
  const [isReplyPlaying, setIsReplyPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showReplyPlayButton, setShowReplyPlayButton] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const mainSwiperRef = useRef(null);
  const replySwiperRef = useRef(null);
  const mainVideoRef = useRef(null);
  const replyVideoRef = useRef(null);

  const getAssetUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseUrl}${url}`;
  };

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/videos');

      if (response.data && Array.isArray(response.data)) {
        setVideos(response.data);

        // تهيئة الإعجابات
        if (user) {
          const userLikedVideos = new Set();
          const userLikedReplies = new Set();
          const userSavedVideos = new Set();
          
          response.data.forEach(video => {
            if (video.likes?.includes(user._id || user.id)) {
              userLikedVideos.add(video._id);
            }
            if (video.saved?.includes(user._id || user.id)) {
              userSavedVideos.add(video._id);
            }
            video.replies?.forEach(reply => {
              if (reply.likes?.includes(user._id || user.id)) {
                userLikedReplies.add(reply._id);
              }
            });
          });
          
          setLikedVideos(userLikedVideos);
          setLikedReplies(userLikedReplies);
          setSavedVideos(userSavedVideos);
        }
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError(error.message || 'فشل في تحميل الفيديوهات');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Handle main scroll for full page navigation
  useEffect(() => {
    let isScrolling = false;
    const handleWheel = (e) => {
      if (isScrolling) return;
      
      e.preventDefault();
      isScrolling = true;
      
      if (e.deltaY > 50 && activeVideoIndex < videos.length - 1) {
        setActiveVideoIndex(prev => prev + 1);
        setActiveReplyIndex(0);
      } else if (e.deltaY < -50 && activeVideoIndex > 0) {
        setActiveVideoIndex(prev => prev - 1);
        setActiveReplyIndex(0);
      }
      
      setTimeout(() => {
        isScrolling = false;
      }, 800);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [activeVideoIndex, videos.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' && activeVideoIndex < videos.length - 1) {
        setActiveVideoIndex(prev => prev + 1);
        setActiveReplyIndex(0);
      } else if (e.key === 'ArrowUp' && activeVideoIndex > 0) {
        setActiveVideoIndex(prev => prev - 1);
        setActiveReplyIndex(0);
      } else if (e.key === 'ArrowRight' && currentVideo?.replies?.length > 0) {
        if (activeReplyIndex < currentVideo.replies.length - 1) {
          setActiveReplyIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft' && currentVideo?.replies?.length > 0) {
        if (activeReplyIndex > 0) {
          setActiveReplyIndex(prev => prev - 1);
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeVideoIndex, activeReplyIndex, videos.length]);

  const togglePlayPause = () => {
    setIsMainPlaying(prev => !prev);
    if (mainVideoRef.current) {
      isMainPlaying ? mainVideoRef.current.pause() : mainVideoRef.current.play();
    }
  };

  const toggleReplyPlayPause = () => {
    setIsReplyPlaying(prev => !prev);
    if (replyVideoRef.current) {
      isReplyPlaying ? replyVideoRef.current.pause() : replyVideoRef.current.play();
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
    if (mainVideoRef.current) mainVideoRef.current.muted = !isMuted;
    if (replyVideoRef.current) replyVideoRef.current.muted = !isMuted;
  };

  const handleLikeMainVideo = async (videoId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await api.post(`/api/videos/${videoId}/like`);
      const liked = response.data.liked;
      
      setLikedVideos(prev => {
        const newSet = new Set(prev);
        liked ? newSet.add(videoId) : newSet.delete(videoId);
        return newSet;
      });
      
      setVideos(prevVideos => 
        prevVideos.map(video => {
          if (video._id === videoId) {
            const userId = user._id || user.id;
            return {
              ...video,
              likes: liked 
                ? [...(video.likes || []), userId]
                : (video.likes || []).filter(id => id !== userId)
            };
          }
          return video;
        })
      );
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleLikeReply = async (replyId, parentId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await api.post(`/api/videos/${replyId}/like`);
      const liked = response.data.liked;
      
      setLikedReplies(prev => {
        const newSet = new Set(prev);
        liked ? newSet.add(replyId) : newSet.delete(replyId);
        return newSet;
      });
      
      setVideos(prevVideos => 
        prevVideos.map(video => {
          if (video._id === parentId) {
            const userId = user._id || user.id;
            return {
              ...video,
              replies: video.replies.map(reply => {
                if (reply._id === replyId) {
                  return {
                    ...reply,
                    likes: liked 
                      ? [...(reply.likes || []), userId]
                      : (reply.likes || []).filter(id => id !== userId)
                  };
                }
                return reply;
              })
            };
          }
          return video;
        })
      );
    } catch (error) {
      console.error('Like reply error:', error);
    }
  };

  const handleSaveVideo = async (videoId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setSavedVideos(prev => {
      const newSet = new Set(prev);
      newSet.has(videoId) ? newSet.delete(videoId) : newSet.add(videoId);
      return newSet;
    });
  };

  const handleReply = (videoId) => {
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      navigate('/login');
      return;
    }
    navigate(`/upload?replyTo=${videoId}`);
  };

  const handleShare = async (video) => {
    const shareUrl = `${window.location.origin}/video/${video._id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `شاهد هذا الفيديو من ${video.user.username}`,
          text: video.description,
          url: shareUrl
        });
      } catch (error) {
        console.log('Share cancelled:', error);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      // Show toast notification
    }
  };

  const navigateToProfile = (username) => navigate(`/profile/${username}`);

  const currentVideo = videos[activeVideoIndex];
  const currentReply = currentVideo?.replies?.[activeReplyIndex];

  // Loading state
  if (loading) return (
    <div className="loading-container">
      <div className="loading-wrapper">
        <div className="loading-spinner"></div>
        <p>جاري تحميل الفيديوهات...</p>
      </div>
    </div>
  );
  
  // Error state
  if (error) return (
    <div className="error-container">
      <div className="error-wrapper">
        <h2>خطأ في التحميل</h2>
        <p>{error}</p>
        <button onClick={fetchVideos} className="retry-btn">
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
  
  // Empty state
  if (!videos?.length) return (
    <div className="empty-state-container">
      <div className="empty-wrapper">
        <h2>لا توجد فيديوهات</h2>
        <p>كن أول من يشارك محتوى!</p>
      </div>
      <NavigationBar currentPage="home" />
    </div>
  );

  return (
    <div className="home-page">
      <div className="content-wrapper">
        {/* النصف الأيسر - الفيديو الأساسي */}
        <div className="main-video-section">
          <div className="video-wrapper">
            <video
              ref={mainVideoRef}
              src={getAssetUrl(currentVideo.videoUrl)}
              className="video-player"
              autoPlay
              loop
              muted={isMuted}
              playsInline
              onClick={togglePlayPause}
            />
            
            {/* Gradient overlay */}
            <div className="video-gradient"></div>

            {/* User info & description */}
            <div className="video-info">
              <div className="user-info" onClick={() => navigateToProfile(currentVideo.user.username)}>
                <span className="username">@{currentVideo.user.username}</span>
              </div>
              <p className="video-description">{currentVideo.description}</p>
              <div className="video-tags">
                {currentVideo.tags?.map((tag, index) => (
                  <span key={index} className="tag">#{tag}</span>
                ))}
              </div>
            </div>

            {/* Action buttons - TikTok style */}
            <div className="action-buttons">
              <div 
                className="profile-btn"
                onClick={() => navigateToProfile(currentVideo.user.username)}
              >
                <img 
                  src={getAssetUrl(currentVideo.user.profileImage) || '/default-avatar.png'} 
                  alt={currentVideo.user.username}
                  className="profile-image"
                />
                <span className="follow-badge">+</span>
              </div>

              <button 
                className={`action-btn ${likedVideos.has(currentVideo._id) ? 'liked' : ''}`}
                onClick={() => handleLikeMainVideo(currentVideo._id)}
              >
                <FaHeart />
                <span>{currentVideo.likes?.length || 0}</span>
              </button>

              <button 
                className="action-btn"
                onClick={() => handleReply(currentVideo._id)}
              >
                <FaComment />
                <span>{currentVideo.replies?.length || 0}</span>
              </button>

              <button 
                className={`action-btn ${savedVideos.has(currentVideo._id) ? 'saved' : ''}`}
                onClick={() => handleSaveVideo(currentVideo._id)}
              >
                <FaBookmark />
                <span>{currentVideo.saved?.length || 0}</span>
              </button>

              <button 
                className="action-btn"
                onClick={() => handleShare(currentVideo)}
              >
                <FaShare />
                <span>مشاركة</span>
              </button>
            </div>

            {/* Volume control */}
            <button className="volume-btn" onClick={toggleMute}>
              {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>

            {/* Video progress indicators */}
            <div className="video-indicators">
              {videos.map((_, index) => (
                <div 
                  key={index}
                  className={`indicator ${index === activeVideoIndex ? 'active' : ''} ${index < activeVideoIndex ? 'passed' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* النصف الأيمن - الردود */}
        <div className="replies-section">
          {currentVideo?.replies?.length > 0 ? (
            <>
              <div className="replies-header">
                <h3>الردود ({currentVideo.replies.length})</h3>
                <div className="reply-indicators">
                  {currentVideo.replies.map((_, index) => (
                    <span 
                      key={index}
                      className={`dot ${index === activeReplyIndex ? 'active' : ''}`}
                      onClick={() => setActiveReplyIndex(index)}
                    />
                  ))}
                </div>
              </div>

              <div className="reply-video-container">
                <Swiper
                  spaceBetween={0}
                  slidesPerView={1}
                  navigation={{
                    prevEl: '.reply-nav-prev',
                    nextEl: '.reply-nav-next'
                  }}
                  modules={[Navigation]}
                  onSlideChange={(swiper) => setActiveReplyIndex(swiper.activeIndex)}
                  onSwiper={(swiper) => {
                    replySwiperRef.current = swiper;
                  }}
                  className="replies-swiper"
                >
                  {currentVideo.replies.map((reply, index) => (
                    <SwiperSlide key={reply._id}>
                      <div className="reply-wrapper">
                        <video
                          ref={index === activeReplyIndex ? replyVideoRef : null}
                          src={getAssetUrl(reply.videoUrl)}
                          className="reply-video"
                          autoPlay={index === activeReplyIndex}
                          loop
                          muted={isMuted}
                          playsInline
                          onMouseEnter={() => setShowReplyPlayButton(true)}
                          onMouseLeave={() => setShowReplyPlayButton(false)}
                          onClick={toggleReplyPlayPause}
                        />

                        {/* Play button overlay for replies */}
                        <div 
                          className={`play-overlay ${showReplyPlayButton ? 'visible' : ''}`}
                          onClick={toggleReplyPlayPause}
                        >
                          {isReplyPlaying ? <FaPause /> : <FaPlay />}
                        </div>

                        {/* Reply gradient */}
                        <div className="reply-gradient"></div>

                        {/* Reply info */}
                        <div className="reply-info">
                          <div 
                            className="reply-user"
                            onClick={() => navigateToProfile(reply.user.username)}
                          >
                            <img 
                              src={getAssetUrl(reply.user.profileImage) || '/default-avatar.png'} 
                              alt={reply.user.username}
                              className="reply-user-avatar"
                            />
                            <span>@{reply.user.username}</span>
                          </div>
                          <p className="reply-description">{reply.description}</p>
                        </div>

                        {/* Reply actions */}
                        <div className="reply-actions">
                          <div 
                            className="reply-profile-btn"
                            onClick={() => navigateToProfile(reply.user.username)}
                          >
                            <img 
                              src={getAssetUrl(reply.user.profileImage) || '/default-avatar.png'} 
                              alt={reply.user.username}
                              className="reply-profile-image"
                            />
                          </div>

                          <button
                            className={`reply-action-btn ${likedReplies.has(reply._id) ? 'liked' : ''}`}
                            onClick={() => handleLikeReply(reply._id, currentVideo._id)}
                          >
                            <FaHeart />
                            <span>{reply.likes?.length || 0}</span>
                          </button>
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>

                {/* Navigation arrows */}
                {currentVideo.replies.length > 1 && (
                  <>
                    <button className="reply-nav reply-nav-prev">
                      <FaChevronRight />
                    </button>
                    <button className="reply-nav reply-nav-next">
                      <FaChevronLeft />
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="no-replies">
              <div className="no-replies-content">
                <div className="no-replies-icon">
                  <FaComment />
                </div>
                <h3>لا توجد ردود بعد</h3>
                <p>كن أول من يشارك رأيه في هذا الفيديو</p>
                <button className="create-reply-btn" onClick={() => handleReply(currentVideo._id)}>
                  إضافة رد
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <NavigationBar currentPage="home" />
    </div>
  );
};

export default HomePage;