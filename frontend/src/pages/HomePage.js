import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard } from 'swiper/modules';
import VideoPlayer from '../components/VideoPlayer';
import ReplySwiper from '../components/ReplySwiper';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import 'swiper/css';
import './HomePage.css';

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
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
        onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
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
              />
              {video.replies && video.replies.length > 0 && (
                <ReplySwiper 
                  replies={video.replies} 
                  parentVideoId={video._id}
                  onDelete={handleDelete}
                />
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Navigation Bar */}
      <div className="nav-bar">
        <button onClick={() => navigate('/')} className="nav-btn active">
          الرئيسية
        </button>
        {user ? (
          <>
            <button onClick={() => navigate(`/profile/${user.username}`)} className="nav-btn">
              الملف الشخصي
            </button>
            {user.isCreator && (
              <button onClick={() => navigate('/upload')} className="nav-btn upload-btn">
                +
              </button>
            )}
          </>
        ) : (
          <button onClick={() => navigate('/login')} className="nav-btn">
            تسجيل الدخول
          </button>
        )}
      </div>
    </div>
  );
};

export default HomePage;