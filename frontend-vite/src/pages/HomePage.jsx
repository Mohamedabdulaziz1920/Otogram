import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard } from 'swiper';
import { FaHeart, FaReply } from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import ReplySwiper from '../components/ReplySwiper';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import VideoPlayerSplit from '../components/VideoPlayerSplit';

import 'swiper/css';
import './HomePage.css';

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [likedReplies, setLikedReplies] = useState(new Set());

  const mainSwiperRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const FOOTER_HEIGHT = 70; // ارتفاع الفوتر - عدله حسب تصميمك

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
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err.message || 'فشل في تحميل الفيديوهات');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  // التمرير العمودي للصفحة كلها (بما في ذلك الردود)
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
    return () => window.removeEventListener('wheel', handleWheel);
  }, [activeVideoIndex, videos.length]);

  const handleLikeVideo = async (videoId) => {
    if (!user) return navigate('/login');
    try {
      const res = await api.post(`/api/videos/${videoId}/like`);
      const liked = res.data.liked;
      setLikedVideos(prev => {
        const newSet = new Set(prev);
        liked ? newSet.add(videoId) : newSet.delete(videoId);
        return newSet;
      });
      setVideos(prevVideos =>
        prevVideos.map(v => v._id === videoId ? {
          ...v,
          likes: liked
            ? [...(v.likes || []), user._id || user.id]
            : (v.likes || []).filter(id => id !== (user._id || user.id))
        } : v)
      );
    } catch (err) { console.error(err); }
  };

  const handleLikeReply = async (replyId, parentId) => {
    if (!user) return navigate('/login');
    try {
      const res = await api.post(`/api/videos/${replyId}/like`);
      const liked = res.data.liked;
      setLikedReplies(prev => {
        const newSet = new Set(prev);
        liked ? newSet.add(replyId) : newSet.delete(replyId);
        return newSet;
      });
      setVideos(prevVideos =>
        prevVideos.map(video => video._id === parentId ? {
          ...video,
          replies: video.replies.map(r => r._id === replyId ? {
            ...r,
            likes: liked
              ? [...(r.likes || []), user._id || user.id]
              : (r.likes || []).filter(id => id !== (user._id || user.id))
          } : r)
        } : video)
      );
    } catch (err) { console.error(err); }
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

  if (!videos.length) return (
    <div className="empty-state-container">
      <h2>لا توجد فيديوهات</h2>
      <NavigationBar currentPage="home" />
    </div>
  );

  // حساب الارتفاع المتاح للشاشة (بعد خصم الفوتر)
  const availableHeight = `calc(100vh - ${FOOTER_HEIGHT}px)`;

  return (
    <div className="home-container" style={{ height: availableHeight }}>
      <div className="top-half" style={{ height: '50%' }}>
        <Swiper
          direction="vertical"
          slidesPerView={1}
          mousewheel={{ sensitivity: 1 }}
          keyboard
          modules={[Mousewheel, Keyboard]}
          onSwiper={(swiper) => mainSwiperRef.current = swiper}
          onSlideChange={(swiper) => setActiveVideoIndex(swiper.activeIndex)}
          className="main-swiper"
        >
          {videos.map((video) => (
            <SwiperSlide key={video._id}>
              <div className="video-container">
                <VideoPlayerSplit
                  videoUrl={getAssetUrl(video.videoUrl)}
                  isActive={video === currentVideo}
                  autoPlay
                  showPlayButton
                />
                <div className="profile-avatar" onClick={() => navigateToProfile(video.user.username)}>
                  <img src={getAssetUrl(video.user.profileImage) || '/default-avatar.png'} alt={video.user.username} />
                </div>
                <div className="video-actions">
                  <button
                    className={`action-btn ${likedVideos.has(video._id) ? 'liked' : ''}`}
                    onClick={() => handleLikeVideo(video._id)}
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

      <div className="bottom-half" style={{ height: '50%' }}>
        {currentVideo?.replies?.length > 0 ? (
          <ReplySwiper
            replies={currentVideo.replies.map(r => ({ ...r, liked: likedReplies.has(r._id) }))}
            parentVideoOwner={currentVideo.user}
            activeIndex={0}
            onLikeReply={(replyId) => handleLikeReply(replyId, currentVideo._id)}
            onProfileClick={navigateToProfile}
          />
        ) : (
          <div className="no-replies">
            <p>لا توجد ردود بعد</p>
            <button className="primary-btn" onClick={() => handleReply(currentVideo._id)}>كن أول من يرد</button>
          </div>
        )}
      </div>

      <NavigationBar currentPage="home" />
    </div>
  );
};

export default HomePage;
