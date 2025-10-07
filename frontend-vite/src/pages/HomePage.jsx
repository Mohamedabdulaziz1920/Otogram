import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FaHeart, FaComment, FaChevronLeft, FaChevronRight,
  FaVolumeUp, FaVolumeMute, FaMoon, FaSun, FaTrash
} from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './HomePage.css';

const HomePage = () => {
  const location = useLocation();
  const [videos, setVideos] = useState([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [activeReplyIndex, setActiveReplyIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [likedReplies, setLikedReplies] = useState(new Set());
  const [isMuted, setIsMuted] = useState(false);
  
  // 🎮 States للتحكم في التشغيل
  const [isMainPlaying, setIsMainPlaying] = useState(false);
  const [isReplyPlaying, setIsReplyPlaying] = useState(false);
  const [showMainPauseIcon, setShowMainPauseIcon] = useState(false);
  const [showReplyPauseIcon, setShowReplyPauseIcon] = useState(false);

  // 🗑️ States لحذف الردود
  const [showDeleteReplyModal, setShowDeleteReplyModal] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState(null);

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

  // 1️⃣ جلب الفيديوهات
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // 2️⃣ التوجيه التلقائي للفيديو
  useEffect(() => {
    if (location.state?.scrollToVideoId && videos.length > 0) {
      const videoIndex = videos.findIndex(v => v._id === location.state.scrollToVideoId);
      
      if (videoIndex !== -1) {
        console.log('🎯 Found video at index:', videoIndex);
        setActiveVideoIndex(videoIndex);
        setActiveReplyIndex(0);
        
        window.history.replaceState({}, document.title);
      } else {
        console.log('⚠️ Video not found in current list');
      }
    }
  }, [location.state, videos]);

  // Helper functions
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

  // 🎮 التحكم في تشغيل الفيديو الرئيسي
  const toggleMainVideo = () => {
    if (mainVideoRef.current) {
      if (isMainPlaying) {
        mainVideoRef.current.pause();
        setIsMainPlaying(false);
      } else {
        mainVideoRef.current.play();
        setIsMainPlaying(true);
        
        setShowMainPauseIcon(true);
        setTimeout(() => setShowMainPauseIcon(false), 1000);
        
        if (replyVideoRef.current && isReplyPlaying) {
          replyVideoRef.current.pause();
          setIsReplyPlaying(false);
        }
      }
    }
  };

  // 🎮 التحكم في تشغيل فيديو الرد
  const toggleReplyVideo = () => {
    if (replyVideoRef.current) {
      if (isReplyPlaying) {
        replyVideoRef.current.pause();
        setIsReplyPlaying(false);
      } else {
        replyVideoRef.current.play();
        setIsReplyPlaying(true);
        
        setShowReplyPauseIcon(true);
        setTimeout(() => setShowReplyPauseIcon(false), 1000);
        
        if (mainVideoRef.current && isMainPlaying) {
          mainVideoRef.current.pause();
          setIsMainPlaying(false);
        }
      }
    }
  };

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

      const velocity = Math.abs(deltaY) / deltaTime;

      if (Math.abs(deltaY) > 50 || velocity > 0.3) {
        if (deltaY > 0) {
          if (activeVideoIndex < videos.length - 1) {
            setActiveVideoIndex(prev => prev + 1);
            setActiveReplyIndex(0);
          }
        } else {
          if (activeVideoIndex > 0) {
            setActiveVideoIndex(prev => prev - 1);
            setActiveReplyIndex(0);
          }
        }
      }
    };

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

      const velocityY = Math.abs(deltaY) / deltaTime;
      const velocityX = Math.abs(deltaX) / deltaTime;

      const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX);
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

      if (isVerticalSwipe && (Math.abs(deltaY) > 50 || velocityY > 0.3)) {
        if (deltaY > 0) {
          if (activeVideoIndex < videos.length - 1) {
            setActiveVideoIndex(prev => prev + 1);
            setActiveReplyIndex(0);
          }
        } else {
          if (activeVideoIndex > 0) {
            setActiveVideoIndex(prev => prev - 1);
            setActiveReplyIndex(0);
          }
        }
      }
      else if (isHorizontalSwipe && (Math.abs(deltaX) > 50 || velocityX > 0.3)) {
        if (deltaX > 0) {
          goToNextReply();
        } else {
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

  // ✅ Scroll handler for vertical navigation
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

  // ✅ Keyboard navigation
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

  // 🎮 إيقاف الفيديوهات وإعادة تعيين الحالة عند تغيير الفيديو
  useEffect(() => {
    setIsMainPlaying(false);
    setIsReplyPlaying(false);
    setShowMainPauseIcon(false);
    setShowReplyPauseIcon(false);
    
    if (mainVideoRef.current) {
      mainVideoRef.current.pause();
      mainVideoRef.current.currentTime = 0;
    }
    
    if (replyVideoRef.current) {
      replyVideoRef.current.pause();
      replyVideoRef.current.currentTime = 0;
    }
  }, [activeVideoIndex, activeReplyIndex]);

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

  // 🗑️ التحقق من صلاحية حذف الرد
  const canDeleteReply = (reply, mainVideo) => {
    if (!user) return false;
    
    const userId = user._id || user.id;
    const replyOwnerId = reply.user._id || reply.user.id;
    const videoOwnerId = mainVideo.user._id || mainVideo.user.id;
    
    // يمكن الحذف إذا كان صاحب الرد أو صاحب الفيديو الأصلي
    return userId === replyOwnerId || userId === videoOwnerId;
  };

  // 🗑️ فتح modal تأكيد الحذف
  const confirmDeleteReply = (replyId, videoId) => {
    setReplyToDelete({ replyId, videoId });
    setShowDeleteReplyModal(true);
  };

  // 🗑️ حذف الرد
  const handleDeleteReply = async () => {
    if (!replyToDelete) return;
    
    try {
      await api.delete(`/api/videos/${replyToDelete.replyId}`);
      
      // تحديث الفيديوهات لإزالة الرد المحذوف
      setVideos(prevVideos => 
        prevVideos.map(video => {
          if (video._id === replyToDelete.videoId) {
            return {
              ...video,
              replies: video.replies.filter(r => r._id !== replyToDelete.replyId)
            };
          }
          return video;
        })
      );
      
      // إعادة تعيين index الرد إذا كان آخر رد
      const currentVideoReplies = videos[activeVideoIndex].replies;
      if (currentVideoReplies.length > 1) {
        if (activeReplyIndex >= currentVideoReplies.length - 1 && activeReplyIndex > 0) {
          setActiveReplyIndex(prev => prev - 1);
        }
      } else {
        setActiveReplyIndex(0);
      }
      
      setShowDeleteReplyModal(false);
      setReplyToDelete(null);
      
      console.log('✅ تم حذف الرد بنجاح');
    } catch (error) {
      console.error('❌ Error deleting reply:', error);
      alert(error.response?.data?.error || 'فشل حذف الرد');
    }
  };

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
      
      <div className="content-wrapper">
        {/* Main Video Section - 50% */}
        <div className="main-video-section">
          <div className="video-container" onClick={toggleMainVideo}>
            <video
              ref={mainVideoRef}
              src={getAssetUrl(currentVideo.videoUrl)}
              className="video-player"
              loop
              muted={isMuted}
              playsInline
            />
            
            {/* Play/Pause Overlay */}
            {!isMainPlaying && (
              <div className="play-overlay">
                <div className="play-button">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            )}

            {/* Pause Indicator */}
            {isMainPlaying && showMainPauseIcon && (
              <div className="pause-indicator">
                <div className="pause-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                </div>
              </div>
            )}
            
            <div className="video-gradient"></div>
          </div>

          <div className="video-info">
            <div className="user-info" onClick={() => navigateToProfile(currentVideo.user.username)}>
              <span className="username">{currentVideo.user.username}</span>
            </div>
            <p className="video-description">{currentVideo.description}</p>
          </div>

          {/* Action Buttons */}
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
<div className="reply-video-wrapper" onClick={toggleReplyVideo}>
  <video
    ref={replyVideoRef}
    key={currentVideo.replies[activeReplyIndex]._id}
    src={getAssetUrl(currentVideo.replies[activeReplyIndex].videoUrl)}
    className="reply-video"
    loop
    muted={isMuted}
    playsInline
  />

  {/* 🗑️ زر الحذف - يظهر لصاحب الرد أو صاحب الفيديو */}
  {canDeleteReply(currentVideo.replies[activeReplyIndex], currentVideo) && (
    <button
      className="delete-reply-btn"
      onClick={(e) => {
        e.stopPropagation();
        confirmDeleteReply(
          currentVideo.replies[activeReplyIndex]._id,
          currentVideo._id
        );
      }}
      title="حذف الرد"
    >
      <FaTrash />
    </button>
  )}

  {/* Play/Pause Overlay للرد */}
  {!isReplyPlaying && (
    <div className="play-overlay">
      <div className="play-button">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
    </div>
  )}

  {/* Pause Indicator للرد */}
  {isReplyPlaying && showReplyPauseIcon && (
    <div className="pause-indicator">
      <div className="pause-icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
      </div>
    </div>
  )}

  <div className="reply-gradient"></div>
</div>

              <div className="reply-info">
                <div 
                  className="reply-user"
                  onClick={() => navigateToProfile(currentVideo.replies[activeReplyIndex].user.username)}
                >
                  <span>{currentVideo.replies[activeReplyIndex].user.username}</span>
                </div>
                <p className="reply-description">{currentVideo.replies[activeReplyIndex].description}</p>
              </div>

              {/* Reply Actions */}
              <div className="reply-actions">
                {/* 🗑️ زر الحذف - يظهر لصاحب الرد أو صاحب الفيديو */}
                {canDeleteReply(currentVideo.replies[activeReplyIndex], currentVideo) && (
                  <button
                    className="delete-reply-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDeleteReply(
                        currentVideo.replies[activeReplyIndex]._id,
                        currentVideo._id
                      );
                    }}
                    title="حذف الرد"
                  >
                    <FaTrash />
                  </button>
                )}

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

      {/* 🗑️ Delete Reply Modal */}
      {showDeleteReplyModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteReplyModal(false)}>
          <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تأكيد حذف الرد</h3>
            </div>
            <div className="modal-body">
              <p>هل أنت متأكد من حذف هذا الرد؟ لا يمكن التراجع عن هذا الإجراء.</p>
            </div>
            <div className="modal-actions">
              <button className="confirm-delete-btn" onClick={handleDeleteReply}>
                <FaTrash /> حذف نهائياً
              </button>
              <button className="cancel-modal-btn" onClick={() => setShowDeleteReplyModal(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <NavigationBar currentPage="home" />
    </div>
  );
};

export default HomePage;
