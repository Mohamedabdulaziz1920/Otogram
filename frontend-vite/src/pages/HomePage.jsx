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

// ✨ 1. إعداد axios instance مع baseURL من متغيرات البيئة
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
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

  // ✨ 2. دالة مساعدة لبناء الروابط الكاملة (مهمة جدًا)
  const getAssetUrl = (url) => {
    if (!url) return '';
    // إذا كان الرابط كاملاً بالفعل، لا تفعل شيئًا
    if (url.startsWith('http')) return url;
    // إذا كان الرابط يبدأ بـ /api/، فهو من السيرفر
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
  };

  // Fetch Videos
  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/videos'); // استخدام api instance

      if (response.data && Array.isArray(response.data)) {
        setVideos(response.data);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError(error.message || 'فشل في تحميل الفيديوهات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // دوال الإعجاب والرد
  const handleLikeMainVideo = (videoId) => { /* ... */ };
  const handleLikeReply = (replyId, parentId) => { /* ... */ };
  const handleReply = (videoId) => navigate(`/upload?replyTo=${videoId}`);
  const navigateToProfile = (username) => navigate(`/profile/${username}`);

  // حالات التحميل والخطأ
  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;
  if (error) return <div className="error-container"><p>{error}</p></div>;
  if (!videos.length) return <div className="empty-state-container"><p>لا توجد فيديوهات بعد</p></div>;

  return (
    // ✨ 3. استخدام هيكل CSS الصحيح
    <div className="home-page-split">
      <Swiper
        direction="vertical"
        slidesPerView={1}
        mousewheel={{ forceToAxis: true }} // ✨ 4. الاعتماد على تمرير Swiper المدمج
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
                <VideoPlayerSplit
                  videoUrl={getAssetUrl(video.videoUrl)}
                  isActive={vIndex === activeVideoIndex}
                  className="video-element"
                />
                <div className="overlay-top">
                  <div className="profile-avatar" onClick={() => navigateToProfile(video.user.username)}>
                    <img src={getAssetUrl(video.user.profileImage) || '/default-avatar.png'} alt={video.user.username} />
                  </div>
                </div>
                <div className="actions">
                  <button className={`action-btn ${likedVideos.has(video._id) ? 'liked' : ''}`} onClick={() => handleLikeMainVideo(video._id)}>
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
                          <VideoPlayerSplit
                            videoUrl={getAssetUrl(reply.videoUrl)}
                            isActive={vIndex === activeVideoIndex && rIndex === (activeRepliesIndex[vIndex] || 0)}
                            className="video-element"
                          />
                          <div className="overlay-bottom">
                            <button className={`action-btn ${likedReplies.has(reply._id) ? 'liked' : ''}`} onClick={() => handleLikeReply(reply._id, video._id)}>
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
