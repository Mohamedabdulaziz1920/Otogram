import React, { useState, useEffect, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard, Navigation } from 'swiper';
import { FaHeart, FaReply, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext'; // استيراد api من AuthContext
import VideoPlayerSplit from '../components/VideoPlayerSplit';

import 'swiper/css';
import 'swiper/css/navigation';
import './HomePage.css';

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [activeRepliesIndex, setActiveRepliesIndex] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [likedReplies, setLikedReplies] = useState(new Set());

  const navigate = useNavigate();
  const { user } = useAuth();

  const getAssetUrl = (url) => {
    if (!url || url === '/default-avatar.png') return '/default-avatar.png';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
  };

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/videos');

      if (response.data && Array.isArray(response.data)) {
        setVideos(response.data);

        // تهيئة الإعجابات الأولية
        if (user?._id) {
          const userLikedVideos = new Set();
          const userLikedReplies = new Set();
          response.data.forEach(video => {
            if (video.likes?.includes(user._id)) userLikedVideos.add(video._id);
            video.replies?.forEach(reply => {
              if (reply.likes?.includes(user._id)) userLikedReplies.add(reply._id);
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

  // دالة موحدة للتعامل مع الإعجاب (أكثر نظافة)
  const handleLike = async (id, isReply, parentId = null) => {
    if (!user) return navigate('/login');

    const targetSet = isReply ? likedReplies : likedVideos;
    const setTargetState = isReply ? setLikedReplies : setLikedVideos;
    
    const newSet = new Set(targetSet);
    const isCurrentlyLiked = newSet.has(id);
    isCurrentlyLiked ? newSet.delete(id) : newSet.add(id);
    setTargetState(newSet);

    // تحديث فوري لعدد الإعجابات
    setVideos(currentVideos => 
      currentVideos.map(video => {
        const updateLikes = (item) => ({
          ...item,
          likes: { length: (item.likes?.length || 0) + (isCurrentlyLiked ? -1 : 1) }
        });

        if (!isReply && video._id === id) return updateLikes(video);
        if (isReply && video._id === parentId) {
          return {
            ...video,
            replies: video.replies.map(reply => (reply._id === id ? updateLikes(reply) : reply))
          };
        }
        return video;
      })
    );

    try {
      await api.post(`/api/videos/${id}/like`, {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (error) {
      console.error('Like failed:', error);
      setTargetState(targetSet); // التراجع في حالة الفشل
    }
  };

  const handleReply = (videoId) => navigate(`/upload?replyTo=${videoId}`);
  const navigateToProfile = (username) => navigate(`/profile/${username}`);

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;
  if (error) return <div className="error-container"><p>{error}</p></div>;
  if (!videos.length) return <div className="empty-state-container"><p>لا توجد فيديوهات بعد</p></div>;

  return (
    <div className="home-page-split">
      <Swiper
        direction="vertical"
        slidesPerView={1}
        mousewheel={{ forceToAxis: true }}
        keyboard
        modules={[Mousewheel, Keyboard]}
        onSlideChange={(swiper) => setActiveVideoIndex(swiper.activeIndex)}
        className="main-swiper"
      >
        {videos
          // ✨ فلتر الأمان لمنع انهيار التطبيق
          .filter(video => video && video.user) 
          .map((video, vIndex) => (
            <SwiperSlide key={video._id}>
              <div className="video-split-slide">
                
                {/* ===== النصف العلوي ===== */}
                <div className="split-top">
                  <VideoPlayerSplit videoUrl={getAssetUrl(video.videoUrl)} isActive={vIndex === activeVideoIndex} className="video-element" />
                  <div className="overlay-top">
                    <div className="profile-avatar" onClick={() => navigateToProfile(video.user.username)}>
                      <img src={getAssetUrl(video.user?.profileImage)} alt={video.user?.username} />
                    </div>
                  </div>
                  <div className="actions">
                    <button className={`action-btn ${likedVideos.has(video._id) ? 'liked' : ''}`} onClick={() => handleLike(video._id, false)}>
                      <FaHeart /> <span>{video.likes?.length || 0}</span>
                    </button>
                    <button className="action-btn" onClick={() => handleReply(video._id)}>
                      <FaReply /> <span>رد</span>
                    </button>
                  </div>
                </div>

                {/* ===== النصف السفلي ===== */}
                <div className="split-bottom">
                  {video.replies?.length > 0 ? (
                    <Swiper
                      slidesPerView={1}
                      navigation={{ prevEl: `.prev-arrow-${vIndex}`, nextEl: `.next-arrow-${vIndex}` }}
                      keyboard
                      modules={[Navigation, Keyboard]}
                      onSlideChange={(swiper) => setActiveRepliesIndex(prev => ({ ...prev, [vIndex]: swiper.activeIndex }))}
                      className="replies-swiper-horizontal"
                    >
                      {video.replies
                        .filter(reply => reply && reply.user) // ✨ فلتر الأمان للردود
                        .map((reply, rIndex) => (
                          <SwiperSlide key={reply._id}>
                            <div className="reply-wrapper">
                              <VideoPlayerSplit videoUrl={getAssetUrl(reply.videoUrl)} isActive={vIndex === activeVideoIndex && rIndex === (activeRepliesIndex[vIndex] || 0)} className="video-element" />
                              <div className="overlay-bottom">
                                <button className={`action-btn ${likedReplies.has(reply._id) ? 'liked' : ''}`} onClick={() => handleLike(reply._id, true, video._id)}>
                                  <FaHeart /> <span>{reply.likes?.length || 0}</span>
                                </button>
                              </div>
                            </div>
                          </SwiperSlide>
                        ))}
                      <div className={`nav-arrow left prev-arrow-${vIndex}`}><FaChevronLeft /></div>
                      <div className={`nav-arrow right next-arrow-${vIndex}`}><FaChevronRight /></div>
                    </Swiper>
                  ) : (
                    <div className="no-replies">
                      <p>لا توجد ردود بعد</p>
                      <button className="primary-btn" onClick={() => handleReply(video._id)}>كن أول من يرد</button>
                    </div>
                  )}
                </div>
              </div>
            </SwiperSlide>
          ))}
      </Swiper>
      <NavigationBar currentPage="home" />
    </div>
  );
};

export default HomePage;
