import React, { useState, useEffect, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard, Navigation } from 'swiper';
import { FaHeart, FaReply, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VideoPlayerSplit from '../components/VideoPlayerSplit';

import 'swiper/css';
import 'swiper/css/navigation';
import './HomePage.css';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://otogram.onrender.com',
});

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
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL || 'https://otogram.onrender.com'}${url}`;
  };

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/videos');

      if (response.data && Array.isArray(response.data)) {
        setVideos(response.data);

        // ✨ 1. تهيئة الإعجابات الأولية
        if (user) {
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
  }, [user]); // تم إضافة user كـ dependency

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // ✨ 2. تنفيذ منطق الإعجاب
  const handleLike = async (id, isReply, parentId = null) => {
    if (!user) {
      navigate('/login');
      return;
    }

    // تحديث الحالة فورًا لتجربة مستخدم أفضل
    const targetSet = isReply ? likedReplies : likedVideos;
    const setTargetState = isReply ? setLikedReplies : setLikedVideos;
    
    const newSet = new Set(targetSet);
    const isCurrentlyLiked = newSet.has(id);
    
    if (isCurrentlyLiked) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setTargetState(newSet);

    // تحديث عدد الإعجابات في UI فورًا
    setVideos(currentVideos => 
      currentVideos.map(video => {
        if (!isReply && video._id === id) {
          const currentLikes = video.likes?.length || 0;
          return { ...video, likes: { length: isCurrentlyLiked ? currentLikes - 1 : currentLikes + 1 } };
        }
        if (isReply && video._id === parentId) {
          return {
            ...video,
            replies: video.replies.map(reply => {
              if (reply._id === id) {
                const currentLikes = reply.likes?.length || 0;
                return { ...reply, likes: { length: isCurrentlyLiked ? currentLikes - 1 : currentLikes + 1 } };
              }
              return reply;
            })
          };
        }
        return video;
      })
    );

    // إرسال الطلب إلى السيرفر في الخلفية
    try {
      await api.post(`/api/videos/${id}/like`, {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      // يمكن إعادة جلب البيانات من السيرفر هنا لتحديث العدد الدقيق، ولكن التحديث الفوري أفضل للتجربة
    } catch (error) {
      console.error('Like failed:', error);
      // إذا فشل الطلب، قم بإعادة الحالة إلى ما كانت عليه
      setTargetState(targetSet);
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
        {videos.map((video, vIndex) => (
          <SwiperSlide key={video._id}>
            <div className="video-split-slide">
              {/* ===== النصف العلوي ===== */}
              <div className="split-top">
                <VideoPlayerSplit videoUrl={getAssetUrl(video.videoUrl)} isActive={vIndex === activeVideoIndex} className="video-element" />
                <div className="overlay-top">
                  <div className="profile-avatar" onClick={() => navigateToProfile(video.user.username)}>
                    <img src={getAssetUrl(video.user.profileImage) || '/default-avatar.png'} alt={video.user.username} />
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
                {video.replies?.length ? (
                  <Swiper
                    slidesPerView={1}
                    navigation={{ prevEl: `.prev-arrow-${vIndex}`, nextEl: `.next-arrow-${vIndex}` }}
                    keyboard
                    modules={[Navigation, Keyboard]}
                    onSlideChange={(swiper) => setActiveRepliesIndex(prev => ({ ...prev, [vIndex]: swiper.activeIndex }))}
                    className="replies-swiper-horizontal"
                  >
                    {video.replies.map((reply, rIndex) => (
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
