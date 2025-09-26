import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard, Navigation } from 'swiper';
import { FaHeart, FaReply, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import 'swiper/css';
import 'swiper/css/navigation';
import './HomePage.css';

const HomePage = () => {
  // State Management
  const [videos, setVideos] = useState([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [activeReplyIndex, setActiveReplyIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [likedReplies, setLikedReplies] = useState(new Set());
  
  const navigate = useNavigate();
  const { user } = useAuth();
const videoRefs = useRef([]);
  // Fetch Videos
  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/videos');
      
      if (response.data && Array.isArray(response.data)) {
        setVideos(response.data);
        
        // Initialize liked videos from user data
        if (user) {
          const userLikedVideos = new Set();
          const userLikedReplies = new Set();
          
          response.data.forEach(video => {
            if (video.likes?.includes(user.id)) {
              userLikedVideos.add(video._id);
            }
            video.replies?.forEach(reply => {
              if (reply.likes?.includes(user.id)) {
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

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Handle Like for Main Video
  const handleLikeMainVideo = async (videoId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.post(`/api/videos/${videoId}/like`);
      
      if (response.data.liked) {
        setLikedVideos(prev => new Set([...prev, videoId]));
      } else {
        setLikedVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(videoId);
          return newSet;
        });
      }

      // Update video likes count
      setVideos(prevVideos => 
        prevVideos.map(video => 
          video._id === videoId 
            ? { ...video, likes: response.data.liked 
                ? [...(video.likes || []), user.id]
                : (video.likes || []).filter(id => id !== user.id)
              }
            : video
        )
      );
    } catch (error) {
      console.error('Error liking video:', error);
    }
  };

  // Handle Like for Reply
  const handleLikeReply = async (replyId, parentVideoId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.post(`/api/videos/${replyId}/like`);
      
      if (response.data.liked) {
        setLikedReplies(prev => new Set([...prev, replyId]));
      } else {
        setLikedReplies(prev => {
          const newSet = new Set(prev);
          newSet.delete(replyId);
          return newSet;
        });
      }

      // Update reply likes count
      setVideos(prevVideos => 
        prevVideos.map(video => 
          video._id === parentVideoId 
            ? {
                ...video,
                replies: video.replies.map(reply =>
                  reply._id === replyId
                    ? { ...reply, likes: response.data.liked 
                        ? [...(reply.likes || []), user.id]
                        : (reply.likes || []).filter(id => id !== user.id)
                      }
                    : reply
                )
              }
            : video
        )
      );
    } catch (error) {
      console.error('Error liking reply:', error);
    }
  };

  // Handle Reply
  const handleReply = (videoId) => {
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      navigate('/login');
      return;
    }
    navigate(`/upload?replyTo=${videoId}`);
  };

  // Navigate to Profile
  const navigateToProfile = (username) => {
    navigate(`/profile/${username}`);
  };

  // Get current video
  const currentVideo = videos[activeVideoIndex];
  const currentReply = currentVideo?.replies?.[activeReplyIndex];

  // Loading State
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">جاري تحميل الفيديوهات...</p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <h2>عذراً، حدث خطأ</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchVideos}>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  // Empty State
  if (!videos || videos.length === 0) {
    return (
      <div className="empty-state-container">
        <div className="empty-state-content">
          <h2>لا توجد فيديوهات</h2>
          <p>كن أول من يشارك فيديو!</p>
        </div>
        <NavigationBar currentPage="home" />
      </div>
    );
  }

  return (
    <div className="home-page-split">
      {/* النصف العلوي - الفيديو الأساسي */}
      <div className="main-video-section">
        <Swiper
          direction="vertical"
          slidesPerView={1}
          mousewheel={true}
          keyboard={true}
          modules={[Mousewheel, Keyboard]}
          onSlideChange={(swiper) => {
            setActiveVideoIndex(swiper.activeIndex);
            setActiveReplyIndex(0);
          }}
          className="main-video-swiper"
        >
          {videos.map((video, index) => (
            <SwiperSlide key={video._id}>
              <div className="main-video-container">
                <video
                  src={video.videoUrl}
                  autoPlay={index === activeVideoIndex}
                  loop
                  muted
                  playsInline
                  className="main-video"
                />
                
                {/* صورة الملف الشخصي - الزاوية اليمنى العلوية */}
                <div 
                  className="profile-avatar top-right"
                  onClick={() => navigateToProfile(video.user.username)}
                >
                  <img 
                    src={video.user.profileImage || '/default-avatar.png'} 
                    alt={video.user.username}
                  />
                </div>

                {/* أزرار التفاعل - الزاوية اليمنى السفلية */}
                <div className="main-video-actions">
                  <button 
                    className={`action-btn ${likedVideos.has(video._id) ? 'liked' : ''}`}
                    onClick={() => handleLikeMainVideo(video._id)}
                  >
                    <FaHeart />
                    <span>{video.likes?.length || 0}</span>
                  </button>
                  
                  <button 
                    className="action-btn reply-btn"
                    onClick={() => handleReply(video._id)}
                  >
                    <FaReply />
                    <span>رد</span>
                  </button>
                </div>

                {/* معلومات الفيديو */}
                <div className="main-video-info">
                  <p className="video-description">{video.description}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* النصف السفلي - الردود */}
      <div className="replies-section-split">
        {currentVideo?.replies && currentVideo.replies.length > 0 ? (
          <>
            <div className="replies-header">
              <h3>الردود ({currentVideo.replies.length})</h3>
            </div>
            
         <Swiper
  direction="vertical"
  slidesPerView={1}
  mousewheel={true}
  keyboard={true}
  modules={[Mousewheel, Keyboard]}
  onSlideChange={(swiper) => {
    setActiveVideoIndex(swiper.activeIndex);
    setActiveReplyIndex(0);

    videoRefs.current.forEach((videoEl, idx) => {
      if (!videoEl) return;
      if (idx === swiper.activeIndex) {
        videoEl.play().catch(err => console.warn("Autoplay blocked:", err));
      } else {
        videoEl.pause();
        videoEl.currentTime = 0;
      }
    });
  }}
>
  {videos.map((video, index) => (
    <SwiperSlide key={video._id}>
      <div className="main-video-container">
        <video
          ref={(el) => (videoRefs.current[index] = el)}
          src={video.videoUrl}
          loop
          muted
          playsInline
          className="main-video"
        />
      </div>
    </SwiperSlide>
  ))}
</Swiper>
            {/* أزرار التنقل المخصصة */}
            <button className="swiper-button-prev-custom">
              <FaChevronRight />
            </button>
            <button className="swiper-button-next-custom">
              <FaChevronLeft />
            </button>
          </>
        ) : (
          <div className="no-replies">
            <p>لا توجد ردود حتى الآن</p>
            <button className="btn btn-primary" onClick={() => handleReply(currentVideo?._id)}>
              كن أول من يرد
            </button>
          </div>
        )}
      </div>

      <NavigationBar currentPage="home" />
    </div>
  );
};

export default HomePage;
