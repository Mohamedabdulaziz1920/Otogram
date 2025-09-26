import React, { useState, useEffect } from 'react';
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

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showRepliesForVideo, setShowRepliesForVideo] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await axios.get('/api/videos');
      setVideos(response.data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = (videoId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/upload?replyTo=${videoId}`);
  };

  const handleDelete = (videoId) => {
    setVideos(videos.filter(v => v._id !== videoId));
    // إذا كان الفيديو المحذوف له ردود مفتوحة، أغلقها
    if (showRepliesForVideo === videoId) {
      setShowRepliesForVideo(null);
    }
  };

  const handleVideoClick = (videoId) => {
    // إظهار/إخفاء الردود للفيديو المحدد
    if (showRepliesForVideo === videoId) {
      setShowRepliesForVideo(null);
    } else {
      setShowRepliesForVideo(videoId);
    }
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="home-page">
      <Swiper
        direction="vertical"
        slidesPerView={1}
        mousewheel={true}
        keyboard={true}
        modules={[Mousewheel, Keyboard]}
        onSlideChange={(swiper) => {
          setActiveIndex(swiper.activeIndex);
          setShowRepliesForVideo(null); // إخفاء الردود عند تغيير الفيديو
          // إيقاف جميع الفيديوهات
          const videos = document.querySelectorAll('video');
          videos.forEach(video => {
            video.pause();
          });
        }}
        className="main-swiper"
      >
        {videos.map((video, index) => (
          <SwiperSlide key={video._id}>
            <div className="video-container">
              <VideoPlayer
                video={video}
                onReply={handleReply}
                onDelete={handleDelete}
                isActive={index === activeIndex && !showRepliesForVideo}
                onVideoClick={() => handleVideoClick(video._id)}
              />
              
              {/* قسم الردود - يظهر عند النقر على الفيديو */}
              {showRepliesForVideo === video._id && video.replies && video.replies.length > 0 && (
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

      <NavigationBar currentPage="home" />
    </div>
  );
};

export default HomePage;
