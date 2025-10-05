import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper';
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

  const navigate = useNavigate();
  const { user } = useAuth();
  const mainVideoRef = useRef(null);
  const replyVideoRef = useRef(null);
  const replySwiperRef = useRef(null);
  const lastScrollTime = useRef(0);

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

        // Initialize likes
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

  // Fixed scroll handler for video navigation
  useEffect(() => {
    const handleWheel = (e) => {
      const now = Date.now();
      // Debounce scrolling to prevent too rapid changes
      if (now - lastScrollTime.current < 500) return;
      
      const delta = e.deltaY;
      
      if (Math.abs(delta) > 30) { // Threshold for scroll
        if (delta > 0) {
          // Scroll down - next video
          if (activeVideoIndex < videos.length - 1) {
            setActiveVideoIndex(prev => prev + 1);
            setActiveReplyIndex(0);
            lastScrollTime.current = now;
          }
        } else {
          // Scroll up - previous video
          if (activeVideoIndex > 0) {
            setActiveVideoIndex(prev => prev - 1);
            setActiveReplyIndex(0);
            lastScrollTime.current = now;
          }
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [activeVideoIndex, videos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch(e.key) {
        case 'ArrowDown':
          if (activeVideoIndex < videos.length - 1) {
            setActiveVideoIndex(prev => prev + 1);
            setActiveReplyIndex(0);
          }
          break;
        case 'ArrowUp':
          if (activeVideoIndex > 0) {
            setActiveVideoIndex(prev => prev - 1);
            setActiveReplyIndex(0);
          }
          break;
        case 'ArrowRight':
          if (currentVideo?.replies?.length > 0 && activeReplyIndex < currentVideo.replies.length - 1) {
            setActiveReplyIndex(prev => prev + 1);
          }
          break;
        case 'ArrowLeft':
          if (activeReplyIndex > 0) {
            setActiveReplyIndex(prev => prev - 1);
          }
          break;
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
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
    }
  };

  const navigateToProfile = (username) => navigate(`/profile/${username}`);

  const currentVideo = videos[activeVideoIndex];
  const currentReply = currentVideo?.replies?.[activeReplyIndex];

  // Navigate to next/previous reply
  const goToNextReply = () => {
    if (currentVideo?.replies && activeReplyIndex < currentVideo.replies.length - 1) {
      setActiveReplyIndex(prev => prev + 1);
    }
  };

  const goToPrevReply = () => {
    if (activeReplyIndex > 0) {
      setActiveReplyIndex(prev => prev - 1);
    }
  };

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
        {/* Left Half - Main Video */}
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
            />
            
            {/* Gradient overlay */}
            <div className="video-gradient"></div>

            {/* User info & description */}
            <div className="video-info">
              <div className="user-info" onClick={() => navigateToProfile(currentVideo.user.username)}>
                <span className="username">@{currentVideo.user.username}</span>
              </div>
              <p className="video-description">{currentVideo.description}</p>
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
                <span>رد</span>
              </button>

              <button 
                className={`action-btn ${savedVideos.has(currentVideo._id) ? 'saved' : ''}`}
                onClick={() => handleSaveVideo(currentVideo._id)}
              >
                <FaBookmark />
                <span>حفظ</span>
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
                  onClick={() => {
                    setActiveVideoIndex(index);
                    setActiveReplyIndex(0);
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Half - Replies */}
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
                <div className="reply-wrapper">
                  <video
                    ref={replyVideoRef}
                    src={getAssetUrl(currentVideo.replies[activeReplyIndex].videoUrl)}
                    className="reply-video"
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                  />

                  {/* Play button overlay */}
                  <div className="play-overlay-center">
                    <button className="play-btn-center" onClick={() => {
                      if (replyVideoRef.current) {
                        if (replyVideoRef.current.paused) {
                          replyVideoRef.current.play();
                        } else {
                          replyVideoRef.current.pause();
                        }
                      }
                    }}>
                      {isReplyPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                  </div>

                  {/* Reply gradient */}
                  <div className="reply-gradient"></div>

                  {/* Reply info */}
                  <div className="reply-info">
                    <div 
                      className="reply-user"
                      onClick={() => navigateToProfile(currentVideo.replies[activeReplyIndex].user.username)}
                    >
                      <span>@{currentVideo.replies[activeReplyIndex].user.username}</span>
                    </div>
                    <p className="reply-description">{currentVideo.replies[activeReplyIndex].description}</p>
                  </div>

                  {/* Reply actions */}
                  <div className="reply-actions">
                    <div 
                      className="reply-profile-btn"
                      onClick={() => navigateToProfile(currentVideo.replies[activeReplyIndex].user.username)}
                    >
                      <img 
                        src={getAssetUrl(currentVideo.replies[activeReplyIndex].user.profileImage) || '/default-avatar.png'} 
                        alt={currentVideo.replies[activeReplyIndex].user.username}
                        className="reply-profile-image"
                      />
                    </div>

                    <button
                      className={`reply-action-btn ${likedReplies.has(currentVideo.replies[activeReplyIndex]._id) ? 'liked' : ''}`}
                      onClick={() => handleLikeReply(currentVideo.replies[activeReplyIndex]._id, currentVideo._id)}
                    >
                      <FaHeart />
                      <span>{currentVideo.replies[activeReplyIndex].likes?.length || 0}</span>
                    </button>
                  </div>
                </div>

                {/* Navigation arrows - Fixed visibility */}
                {currentVideo.replies.length > 1 && (
                  <>
                    <button 
                      className={`reply-nav reply-nav-prev ${activeReplyIndex === 0 ? 'disabled' : ''}`}
                      onClick={goToPrevReply}
                      disabled={activeReplyIndex === 0}
                    >
                      <FaChevronRight />
                    </button>
                    <button 
                      className={`reply-nav reply-nav-next ${activeReplyIndex === currentVideo.replies.length - 1 ? 'disabled' : ''}`}
                      onClick={goToNextReply}
                      disabled={activeReplyIndex === currentVideo.replies.length - 1}
                    >
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