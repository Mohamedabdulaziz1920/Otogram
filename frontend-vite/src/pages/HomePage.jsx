import React, { useState, useEffect, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard, Navigation } from 'swiper/modules';
import { FaHeart, FaReply, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import VideoPlayer from '../components/VideoPlayer'; // استيراد المكون الجديد

import 'swiper/css';
import 'swiper/css/navigation';
import './HomePage.css';

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeMainIndex, setActiveMainIndex] = useState(0);
  const [activeReplyIndex, setActiveReplyIndex] = useState(null); 

  const navigate = useNavigate();
  const { user } = useAuth();

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
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err.message || 'فشل في تحميل الفيديوهات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);
  
  const handleLike = async (videoId, isReply = false) => {
    if (!user) return navigate('/login');
    try {
        setVideos(prevVideos => 
            prevVideos.map(video => {
                const updateLikes = (item) => {
                    if (item._id === videoId) {
                        const liked = item.likes.includes(user._id);
                        return {
                            ...item,
                            likes: liked 
                                ? item.likes.filter(id => id !== user._id)
                                : [...item.likes, user._id]
                        };
                    }
                    return item;
                };
                if (isReply) {
                    return { ...video, replies: video.replies.map(updateLikes) };
                }
                return updateLikes(video);
            })
        );
        await api.post(`/api/videos/${videoId}/like`);
    } catch (err) {
        console.error('Like error:', err);
        fetchVideos(); 
    }
  };

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div><p>جاري تحميل الفيديوهات...</p></div>;
  if (error) return <div className="error-container"><h2>خطأ</h2><p>{error}</p><button onClick={fetchVideos}>إعادة المحاولة</button></div>;
  if (!videos?.length) return <div className="empty-state-container"><h2>لا توجد فيديوهات بعد</h2><NavigationBar currentPage="home" /></div>;

  return (
    <div className="home-container">
      <Swiper
        direction="vertical"
        slidesPerView={1}
        mousewheel={{ sensitivity: 1.2 }}
        keyboard
        modules={[Mousewheel, Keyboard]}
        className="main-swiper"
        onSlideChange={(swiper) => {
          setActiveMainIndex(swiper.activeIndex);
          setActiveReplyIndex(null);
        }}
      >
        {videos.map((video, mainIndex) => (
          <SwiperSlide key={video._id} className="main-slide">
            <div className="main-video-container" onClick={() => setActiveReplyIndex(null)}>
              <VideoPlayer
                src={getAssetUrl(video.videoUrl)}
                isActive={activeMainIndex === mainIndex && activeReplyIndex === null}
              />
            </div>
            
            <div className="overlay-ui">
                <div className="video-info">
                  <h3 onClick={() => navigate(`/profile/${video.user.username}`)}>@{video.user.username}</h3>
                  <p>{video.description}</p>
                </div>
                <div className="video-actions">
                  <button className={`action-btn ${video.likes.includes(user?._id) ? 'liked' : ''}`} onClick={() => handleLike(video._id)}>
                    <FaHeart />
                    <span>{video.likes.length}</span>
                  </button>
                  <button className="action-btn" onClick={() => navigate(`/upload?replyTo=${video._id}`)}>
                    <FaReply />
                    <span>{video.replies.length}</span>
                  </button>
                </div>
            </div>

            {video.replies && video.replies.length > 0 && (
              <div className="replies-section">
                <Swiper
                  slidesPerView={'auto'}
                  spaceBetween={10}
                  navigation={{ prevEl: `.nav-prev-${mainIndex}`, nextEl: `.nav-next-${mainIndex}` }}
                  modules={[Navigation]}
                  className="replies-swiper"
                  onSlideChange={(swiper) => setActiveReplyIndex(swiper.activeIndex)}
                  onReachBeginning={() => setActiveReplyIndex(0)}
                  onTouchStart={() => {
                      if (activeReplyIndex === null) setActiveReplyIndex(0);
                  }}
                >
                  {video.replies.map((reply, replyIndex) => (
                    <SwiperSlide key={reply._id} className="reply-slide">
                      <div className="reply-video-container">
                        <VideoPlayer
                          src={getAssetUrl(reply.videoUrl)}
                          isActive={activeMainIndex === mainIndex && activeReplyIndex === replyIndex}
                        />
                         <div className="reply-overlay">
                            <img src={getAssetUrl(reply.user.profileImage) || '/default-avatar.png'} alt={reply.user.username} className="reply-avatar" onClick={() => navigate(`/profile/${reply.user.username}`)} />
                            <button className={`reply-like-btn ${reply.likes.includes(user?._id) ? 'liked' : ''}`} onClick={() => handleLike(reply._id, true)}>
                                <FaHeart />
                                <span>{reply.likes.length}</span>
                            </button>
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
                <button className={`nav-btn nav-prev nav-prev-${mainIndex}`}><FaChevronLeft /></button>
                <button className={`nav-btn nav-next nav-next-${mainIndex}`}><FaChevronRight /></button>
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
      <NavigationBar currentPage="home" />
    </div>
  );
};

export default HomePage;
