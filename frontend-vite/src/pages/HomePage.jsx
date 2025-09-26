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
  const [showReplies, setShowReplies] = useState(false);
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
  };

  const handleVideoClick = () => {
    setShowReplies(true);
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
          setShowReplies(false);
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
                isActive={index === activeIndex}
                onVideoClick={handleVideoClick}
              />
              
              {/* قسم الردود - يظهر عند النقر على الفيديو */}
              {showReplies && video.replies && video.replies.length > 0 && (
                <RepliesSection
                  replies={video.replies}
                  parentVideoOwner={video.user._id}
                  onDelete={handleDelete}
                  onClose={() => setShowReplies(false)}
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
