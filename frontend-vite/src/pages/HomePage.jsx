import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard } from 'swiper';
import VideoPlayer from '../components/VideoPlayer';
import RepliesSection from '../components/RepliesSection';
import NavigationBar from '../components/NavigationBar';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import 'swiper/css';
import './HomePage.css';

/**
 * الصفحة الرئيسية - عرض الفيديوهات بشكل عمودي
 * @component
 */
const HomePage = () => {
  // ==================== State Management ====================
  const [videos, setVideos] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRepliesForVideo, setShowRepliesForVideo] = useState(null);
  
  // ==================== Hooks ====================
  const navigate = useNavigate();
  const { user } = useAuth();

  // ==================== Fetch Videos ====================
  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/videos');
      
      // التحقق من صحة البيانات
      if (response.data && Array.isArray(response.data)) {
        setVideos(response.data);
      } else {
        throw new Error('Invalid data format');
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError(error.message || 'فشل في تحميل الفيديوهات');
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== Effects ====================
  useEffect(() => {
    fetchVideos();
    
    // تنظيف عند مغادرة الصفحة
    return () => {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        video.pause();
        video.src = '';
      });
    };
  }, [fetchVideos]);

  // ==================== Event Handlers ====================
  /**
   * معالج الرد على الفيديو
   */
  const handleReply = useCallback((videoId) => {
    if (!user) {
      // حفظ الصفحة الحالية للعودة إليها بعد تسجيل الدخول
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      navigate('/login');
      return;
    }
    navigate(`/upload?replyTo=${videoId}`);
  }, [user, navigate]);

  /**
   * معالج حذف الفيديو
   */
  const handleDelete = useCallback((videoId) => {
    // تحديث قائمة الفيديوهات
    setVideos(prevVideos => prevVideos.filter(v => v._id !== videoId));
    
    // إغلاق الردود إذا كان الفيديو المحذوف مفتوحاً
    if (showRepliesForVideo === videoId) {
      setShowRepliesForVideo(null);
    }
    
    // إظهار رسالة نجاح (يمكن استبدالها بـ toast notification)
    console.log('تم حذف الفيديو بنجاح');
  }, [showRepliesForVideo]);

  /**
   * معالج النقر على الفيديو لإظهار/إخفاء الردود
   */
  const handleVideoClick = useCallback((videoId) => {
    setShowRepliesForVideo(prevId => prevId === videoId ? null : videoId);
  }, []);

  /**
   * معالج تغيير الشريحة
   */
  const handleSlideChange = useCallback((swiper) => {
    setActiveIndex(swiper.activeIndex);
    setShowRepliesForVideo(null);
    
    // إيقاف جميع الفيديوهات بشكل أكثر كفاءة
    requestAnimationFrame(() => {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        if (!video.paused) {
          video.pause();
        }
      });
    });
  }, []);

  // ==================== Memoized Values ====================
  /**
   * إعدادات Swiper
   */
  const swiperConfig = useMemo(() => ({
    direction: "vertical",
    slidesPerView: 1,
    mousewheel: {
      sensitivity: 1,
      forceToAxis: true,
    },
    keyboard: {
      enabled: true,
      onlyInViewport: true,
    },
    speed: 400,
    resistanceRatio: 0,
    watchSlidesProgress: true,
    modules: [Mousewheel, Keyboard],
  }), []);

  // ==================== Loading State ====================
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">جاري تحميل الفيديوهات...</p>
      </div>
    );
  }

  // ==================== Error State ====================
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

  // ==================== Empty State ====================
  if (!videos || videos.length === 0) {
    return (
      <div className="empty-state-container">
        <div className="empty-state-content">
          <h2>لا توجد فيديوهات</h2>
          <p>كن أول من يشارك فيديو!</p>
          {user?.isCreator && (
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/upload')}
            >
              رفع فيديو
            </button>
          )}
        </div>
        <NavigationBar currentPage="home" />
      </div>
    );
  }

  // ==================== Main Render ====================
  return (
    <div className="home-page">
      <Swiper
        {...swiperConfig}
        onSlideChange={handleSlideChange}
        className="main-swiper"
      >
        {videos.map((video, index) => (
          <SwiperSlide key={video._id} className="video-slide">
            <div className="video-container">
              {/* مشغل الفيديو الرئيسي */}
              <VideoPlayer
                video={video}
                onReply={handleReply}
                onDelete={handleDelete}
                isActive={index === activeIndex && !showRepliesForVideo}
                onVideoClick={() => handleVideoClick(video._id)}
                parentVideoOwner={null}
              />
              
              {/* قسم الردود - يظهر عند النقر على الفيديو */}
              {showRepliesForVideo === video._id && 
               video.replies && 
               video.replies.length > 0 && (
                <RepliesSection
                  replies={video.replies}
                  parentVideo={video}
                  parentVideoOwner={video.user._id}
                  onDelete={handleDelete}
                  onClose={() => setShowRepliesForVideo(null)}
                />
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* شريط التنقل السفلي */}
      <NavigationBar currentPage="home" />
    </div>
  );
};

// ==================== Display Name ====================
HomePage.displayName = 'HomePage';

export default HomePage;
