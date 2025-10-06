import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FaHeart, FaComment, FaChevronLeft, FaChevronRight,
  FaVolumeUp, FaVolumeMute, FaMoon, FaSun
} from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './HomePage.css';

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [activeReplyIndex, setActiveReplyIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [likedReplies, setLikedReplies] = useState(new Set());
  const [isMuted, setIsMuted] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const mainVideoRef = useRef(null);
  const replyVideoRef = useRef(null);
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

        if (user) {
          const userLikedVideos = new Set();
          const userLikedReplies = new Set();
          
          response.data.forEach(video => {
            if (video.likes?.includes(user._id || user.id)) {
              userLikedVideos.add(video._id);
            }
            video.replies?.forEach(reply => {
              if (reply.likes?.includes(user._id || user.id)) {
                userLikedReplies.add(reply._id);
              }
            });
          });
          
          setLikedVideos(userLikedVideos);
          setLikedReplies(userLikedReplies);
        }
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError(error.message || 'فشل في تحميل الفيديوهات');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ✅ useEffect منفصل لجلب الفيديوهات
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Helper functions - يجب تعريفها قبل الـ useEffect
  const goToNextReply = useCallback(() => {
    setActiveReplyIndex(prev => {
      const currentVideo = videos[activeVideoIndex];
      if (currentVideo?.replies && prev < currentVideo.replies.length - 1) {
        return prev + 1;
      }
      return prev;
    });
  }, [videos, activeVideoIndex]);

  const goToPrevReply = useCallback(() => {
    setActiveReplyIndex(prev => {
      if (prev > 0) {
        return prev - 1;
      }
      return prev;
    });
  }, []);

  // ✅ Touch events for mobile - محسّن للردود
  useEffect(() => {
    let touchStartY = 0;
    let touchStartX = 0;
    let touchStartTime = 0;

    const handleMainTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchStartTime = Date.now();
    };

    const handleMainTouchEnd = (e) => {
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();
      const deltaY = touchStartY - touchEndY;
      const deltaTime = touchEndTime - touchStartTime;

      // سرعة التمرير
      const velocity = Math.abs(deltaY) / deltaTime;

      // إذا كان التمرير سريع أو المسافة كبيرة
      if (Math.abs(deltaY) > 50 || velocity > 0.3) {
        if (deltaY > 0) {
          // Swipe up - next video
          if (activeVideoIndex < videos.length - 1) {
            setActiveVideoIndex(prev => prev + 1);
            setActiveReplyIndex(0);
          }
        } else {
          // Swipe down - previous video
          if (activeVideoIndex > 0) {
            setActiveVideoIndex(prev => prev - 1);
            setActiveReplyIndex(0);
          }
        }
      }
    };

    // 🔥 التعديل الجديد: دعم التمرير العمودي والأفقي للردود
    const handleReplyTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const handleReplyTouchEnd = (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();
      
      const deltaX = touchStartX - touchEndX;
      const deltaY = touchStartY - touchEndY;
      const deltaTime = touchEndTime - touchStartTime;

      // حساب السرعة
      const velocityY = Math.abs(deltaY) / deltaTime;
      const velocityX = Math.abs(deltaX) / deltaTime;

      // تحديد اتجاه التمرير الأساسي
      const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX);
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

      // التمرير العمودي - الانتقال بين الفيديوهات
      if (isVerticalSwipe && (Math.abs(deltaY) > 50 || velocityY > 0.3)) {
        if (deltaY > 0) {
          // Swipe up - next video
          if (activeVideoIndex < videos.length - 1) {
            setActiveVideoIndex(prev => prev + 1);
            setActiveReplyIndex(0);
          }
        } else {
          // Swipe down - previous video
          if (activeVideoIndex > 0) {
            setActiveVideoIndex(prev => prev - 1);
            setActiveReplyIndex(0);
          }
        }
      }
      // التمرير الأفقي - الانتقال بين الردود
      else if (isHorizontalSwipe && (Math.abs(deltaX) > 50 || velocityX > 0.3)) {
        if (deltaX > 0) {
          // Swipe left - next reply
          goToNextReply();
        } else {
          // Swipe right - previous reply
          goToPrevReply();
        }
      }
    };

    const mainSection = document.querySelector('.main-video-section');
    const replySection = document.querySelector('.replies-section');

    if (mainSection) {
      mainSection.addEventListener('touchstart', handleMainTouchStart, { passive: true });
      mainSection.addEventListener('touchend', handleMainTouchEnd, { passive: true });
    }

    if (replySection) {
      replySection.addEventListener('touchstart', handleReplyTouchStart, { passive: true });
      replySection.addEventListener('touchend', handleReplyTouchEnd, { passive: true });
    }

    return () => {
      if (mainSection) {
        mainSection.removeEventListener('touchstart', handleMainTouchStart);
        mainSection.removeEventListener('touchend', handleMainTouchEnd);
      }
      if (replySection) {
        replySection.removeEventListener('touchstart', handleReplyTouchStart);
        replySection.removeEventListener('touchend', handleReplyTouchEnd);
      }
    };
  }, [activeVideoIndex, videos.length, goToNextReply, goToPrevReply]);

  // ⚠️ احذف الكود المكرر من هنا إلى نهاية useEffect القديم
  // (من السطر 161 إلى 197 في كودك الحالي)

  // ✅ Scroll handler for vertical navigation - منفصل
  useEffect(() => {
    const handleWheel = (e) => {
      const now = Date.now();
      if (now - lastScrollTime.current < 500) return;
      
      const delta = e.deltaY;
      
      if (Math.abs(delta) > 30) {
        if (delta > 0) {
          if (activeVideoIndex < videos.length - 1) {
            setActiveVideoIndex(prev => prev + 1);
            setActiveReplyIndex(0);
            lastScrollTime.current = now;
          }
        } else {
          if (activeVideoIndex > 0) {
            setActiveVideoIndex(prev => prev - 1);
            setActiveReplyIndex(0);
            lastScrollTime.current = now;
          }
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [activeVideoIndex, videos.length]);

  // ✅ Keyboard navigation - منفصل
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
          goToPrevReply();
          break;
        case 'ArrowLeft':
          goToNextReply();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeVideoIndex, videos.length, goToNextReply, goToPrevReply]);

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

  const handleReply = (videoId) => {
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      navigate('/login');
      return;
    }
    navigate(`/upload?replyTo=${videoId}`);
  };

  const navigateToProfile = (username) => navigate(`/profile/${username}`);

  const currentVideo = videos[activeVideoIndex];

  if (loading) return (
    <div className="loading-container">
      <div className="loading-wrapper">
        <div className="loading-spinner"></div>
        <p>جاري تحميل الفيديوهات...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="error-container">
      <div className="error-wrapper">
        <h2>خطأ في التحميل</h2>
        <p>{error}</p>
        <button onClick={fetchVideos} className="retry-btn">إعادة المحاولة</button>
      </div>
    </div>
  );
  
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
      {/* Theme Toggle */}
      <button className="theme-toggle" onClick={toggleTheme}>
        {theme === 'dark' ? <FaSun /> : <FaMoon />}
      </button>

      {/* Volume Control */}
      <button className="volume-btn" onClick={toggleMute}>
        {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
      </button>

      <div className="content-wrapper">
        {/* Main Video Section - 50% */}
        <div className="main-video-section">
          <video
            ref={mainVideoRef}
            src={getAssetUrl(currentVideo.videoUrl)}
            className="video-player"
            autoPlay
            loop
            muted={isMuted}
            playsInline
          />
          
          <div className="video-gradient"></div>

          <div className="video-info">
            <div className="user-info" onClick={() => navigateToProfile(currentVideo.user.username)}>
              <span className="username">@{currentVideo.user.username}</span>
            </div>
            <p className="video-description">{currentVideo.description}</p>
          </div>

          {/* Simplified Action Buttons */}
          <div className="action-buttons">
            <div 
              className="action-btn-unified profile-btn"
              onClick={() => navigateToProfile(currentVideo.user.username)}
            >
              <img 
                src={getAssetUrl(currentVideo.user.profileImage) || '/default-avatar.png'} 
                alt={currentVideo.user.username}
                className="profile-image"
              />
            </div>

            <button 
              className={`action-btn-unified ${likedVideos.has(currentVideo._id) ? 'liked' : ''}`}
              onClick={() => handleLikeMainVideo(currentVideo._id)}
            >
              <FaHeart />
              <span className="count">{currentVideo.likes?.length || 0}</span>
            </button>

            <button 
              className="action-btn-unified"
              onClick={() => handleReply(currentVideo._id)}
            >
              <FaComment />
              <span className="count">{currentVideo.replies?.length || 0}</span>
            </button>
          </div>

          {/* Video Indicators */}
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

        {/* Replies Section - 50% */}
        <div className="replies-section">
          {currentVideo?.replies?.length > 0 ? (
            <div className="reply-video-container">
              <video
                ref={replyVideoRef}
                key={currentVideo.replies[activeReplyIndex]._id}
                src={getAssetUrl(currentVideo.replies[activeReplyIndex].videoUrl)}
                className="reply-video"
                autoPlay
                loop
                muted={isMuted}
                playsInline
              />

              <div className="reply-gradient"></div>

              <div className="reply-info">
                <div 
                  className="reply-user"
                  onClick={() => navigateToProfile(currentVideo.replies[activeReplyIndex].user.username)}
                >
                  <span>@{currentVideo.replies[activeReplyIndex].user.username}</span>
                </div>
                <p className="reply-description">{currentVideo.replies[activeReplyIndex].description}</p>
              </div>

              {/* Reply Actions */}
              <div className="reply-actions">
                <div 
                  className="action-btn-unified reply-profile-btn"
                  onClick={() => navigateToProfile(currentVideo.replies[activeReplyIndex].user.username)}
                >
                  <img 
                    src={getAssetUrl(currentVideo.replies[activeReplyIndex].user.profileImage) || '/default-avatar.png'} 
                    alt={currentVideo.replies[activeReplyIndex].user.username}
                    className="profile-image"
                  />
                </div>

                <button
                  className={`action-btn-unified ${likedReplies.has(currentVideo.replies[activeReplyIndex]._id) ? 'liked' : ''}`}
                  onClick={() => handleLikeReply(currentVideo.replies[activeReplyIndex]._id, currentVideo._id)}
                >
                  <FaHeart />
                  <span className="count">{currentVideo.replies[activeReplyIndex].likes?.length || 0}</span>
                </button>
              </div>

              {/* Navigation Arrows */}
              {currentVideo.replies.length > 1 && (
                <>
                  <button 
                    className={`reply-nav reply-nav-right ${activeReplyIndex === 0 ? 'disabled' : ''}`}
                    onClick={goToPrevReply}
                    disabled={activeReplyIndex === 0}
                  >
                    <FaChevronRight />
                  </button>
                  <button 
                    className={`reply-nav reply-nav-left ${activeReplyIndex === currentVideo.replies.length - 1 ? 'disabled' : ''}`}
                    onClick={goToNextReply}
                    disabled={activeReplyIndex === currentVideo.replies.length - 1}
                  >
                    <FaChevronLeft />
                  </button>
                </>
              )}

              {/* Reply Counter */}
              <div className="reply-counter">
                {activeReplyIndex + 1} / {currentVideo.replies.length}
              </div>
            </div>
          ) : (
            <div className="no-replies">
              <div className="no-replies-content">
                <div className="no-replies-icon">
                  <FaComment />
                </div>
                <h3>لا توجد ردود بعد</h3>
                <p>كن أول من يشارك رأيه</p>
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
