import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard, Navigation } from 'swiper';
import { FaHeart, FaReply, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import VideoPlayerSplit from '../components/VideoPlayerSplit';

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

  const navigate = useNavigate();
  const { user } = useAuth();
  const mainSwiperRef = useRef(null);

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
            if (video.likes?.includes(user._id || user.id)) userLikedVideos.add(video._id);
            video.replies?.forEach(reply => {
              if (reply.likes?.includes(user._id || user.id)) userLikedReplies.add(reply._id);
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

  // ===================================
  // HANDLE VERTICAL SCROLL FOR FULL PAGE
  // ===================================
  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault();
      if (!videos.length) return;

      if (e.deltaY > 0 && activeVideoIndex < videos.length - 1) {
        mainSwiperRef.current?.slideNext();
      } else if (e.deltaY < 0 && activeVideoIndex > 0) {
        mainSwiperRef.current?.slidePrev();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [activeVideoIndex, videos.length]);

  // ====================
  // LIKE & REPLY HANDLERS
  // ====================
  const handleLikeMainVideo = async (videoId) => {
    if (!user) return navigate('/login');
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
    if (!user) return navigate('/login');
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

  // ====================
  // LOADING / ERROR / EMPTY STATES
  // ====================
  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>جاري تحميل الفيديوهات...</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <h2>خطأ</h2>
      <p>{error}</p>
      <button onClick={fetchVideos}>إعادة المحاولة</button>
    </div>
  );

  if (!videos?.length) return (
    <div className="empty-state-container">
      <h2>لا توجد فيديوهات</h2>
      <NavigationBar currentPage="home" />
    </div>
  );

  // ====================
  // MAIN RENDER
  // ====================
  return (
    <div className="home-container">
      {/* TOP HALF - MAIN VIDEO */}
      <div className="top-half">
        <Swiper
          direction="vertical"
          slidesPerView={1}
          mousewheel={{ sensitivity: 1 }}
          keyboard
          modules={[Mousewheel, Keyboard]}
          onSwiper={(swiper) => mainSwiperRef.current = swiper}
          onSlideChange={(swiper) => {
            setActiveVideoIndex(swiper.activeIndex);
            setActiveReplyIndex(0);
          }}
          className="main-swiper"
        >
          {videos.map((video, index) => (
            <SwiperSlide key={video._id}>
              <div className="video-container">
                <VideoPlayerSplit
                  videoUrl={getAssetUrl(video.videoUrl)}
                  isActive={index === activeVideoIndex}
                  autoPlay={true}
                  showPlayButton={true}
                />

                <div 
                  className="profile-avatar"
                  onClick={() => navigateToProfile(video.user.username)}
                >
                  <img src={getAssetUrl(video.user.profileImage) || '/default-avatar.png'} alt={video.user.username} />
                </div>

                <div className="video-actions">
                  <button 
                    className={`action-btn ${likedVideos.has(video._id) ? 'liked' : ''}`}
                    onClick={() => handleLikeMainVideo(video._id)}
                  >
                    <FaHeart />
                    <span>{video.likes?.length || 0}</span>
                  </button>
                  <button className="action-btn" onClick={() => handleReply(video._id)}>
                    <FaReply />
                    <span>رد</span>
                  </button>
                </div>

                <div className="video-info">
                  <p className="video-description">{video.description}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* BOTTOM HALF - REPLIES */}
      <div className="bottom-half">
        {currentVideo?.replies?.length > 0 ? (
          <Swiper
            spaceBetween={0}
            slidesPerView={1}
            navigation={{
              prevEl: '.nav-prev',
              nextEl: '.nav-next'
            }}
            modules={[Navigation]}
            onSlideChange={(s) => setActiveReplyIndex(s.activeIndex)}
            className="replies-swiper"
          >
            {currentVideo.replies.map((reply, index) => (
              <SwiperSlide key={reply._id}>
                <div className="reply-container">
                  <VideoPlayerSplit
                    videoUrl={getAssetUrl(reply.videoUrl)}
                    isActive={index === activeReplyIndex}
                    autoPlay={true}
                    showPlayButton={true}
                  />

                  <div 
                    className="profile-avatar reply-avatar"
                    onClick={() => navigateToProfile(reply.user.username)}
                  >
                    <img src={getAssetUrl(reply.user.profileImage) || '/default-avatar.png'} alt={reply.user.username} />
                  </div>

                  <div className="reply-actions">
                    <button
                      className={`action-btn ${likedReplies.has(reply._id) ? 'liked' : ''}`}
                      onClick={() => handleLikeReply(reply._id, currentVideo._id)}
                    >
                      <FaHeart />
                      <span>{reply.likes?.length || 0}</span>
                    </button>
                  </div>
                </div>
              </SwiperSlide>
            ))}

            {currentVideo.replies.length > 1 && (
              <>
                <button className="nav-btn nav-prev"><FaChevronRight /></button>
                <button className="nav-btn nav-next"><FaChevronLeft /></button>
              </>
            )}
          </Swiper>
        ) : (
          <div className="no-replies">
            <p>لا توجد ردود بعد</p>
            <button className="primary-btn" onClick={() => handleReply(currentVideo._id)}>
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
