import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  // Fetch Videos
  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get('/api/videos');

      if (response.data && Array.isArray(response.data)) {
        setVideos(response.data);

        // initialize likes
        if (user) {
          const userLikedVideos = new Set();
          const userLikedReplies = new Set();

          response.data.forEach(video => {
            if (video.likes?.includes(user.id)) {
              userLikedVideos.add(video._id);
            }
            video.replies?.forEach(reply => {
              if (reply.likes?.includes(user.id)) {
                userLikedReplies.add(reply._id);
              }
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

  // Handle wheel event for both sections
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.deltaY < 0 && activeVideoIndex > 0) {
        // Scroll up - previous video
        mainSwiperRef.current?.slidePrev();
      } else if (e.deltaY > 0 && activeVideoIndex < videos.length - 1) {
        // Scroll down - next video
        mainSwiperRef.current?.slideNext();
      }
    };

    const bottomHalf = document.querySelector('.bottom-half');
    if (bottomHalf) {
      bottomHalf.addEventListener('wheel', handleWheel);
    }

    return () => {
      if (bottomHalf) {
        bottomHalf.removeEventListener('wheel', handleWheel);
      }
    };
  }, [activeVideoIndex, videos.length]);

  // Likes management
  const handleLikeMainVideo = async (videoId) => {
    if (!user) return navigate('/login');
    try {
      const res = await axios.post(`/api/videos/${videoId}/like`);
      const liked = res.data.liked;
      setLikedVideos(prev => {
        const newSet = new Set(prev);
        liked ? newSet.add(videoId) : newSet.delete(videoId);
        return newSet;
      });
      setVideos(vs => vs.map(v =>
        v._id === videoId
          ? { ...v, likes: liked
            ? [...(v.likes || []), user.id]
            : (v.likes || []).filter(id => id !== user.id) }
          : v
      ));
    } catch (e) { console.log(e); }
  };

  const handleLikeReply = async (replyId, parentId) => {
    if (!user) return navigate('/login');
    try {
      const res = await axios.post(`/api/videos/${replyId}/like`);
      const liked = res.data.liked;
      setLikedReplies(prev => {
        const newSet = new Set(prev);
        liked ? newSet.add(replyId) : newSet.delete(replyId);
        return newSet;
      });
      setVideos(vs => vs.map(v =>
        v._id === parentId
          ? {
            ...v,
            replies: v.replies.map(r =>
              r._id === replyId
                ? {
                  ...r,
                  likes: liked
                    ? [...(r.likes || []), user.id]
                    : (r.likes || []).filter(id => id !== user.id)
                }
                : r
            )
          }
          : v
      ));
    } catch (e) { console.log(e); }
  };

  const handleReply = (videoId) => {
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      return navigate('/login');
    }
    navigate(`/upload?replyTo=${videoId}`);
  };

  const navigateToProfile = (username) => navigate(`/profile/${username}`);

  const currentVideo = videos[activeVideoIndex];

  // States for loading/error
  if (loading) return <div className="loading-container"><div className="loading-spinner"></div><p>جاري تحميل الفيديوهات...</p></div>;
  if (error) return <div className="error-container"><h2>خطأ</h2><p>{error}</p><button onClick={fetchVideos}>إعادة المحاولة</button></div>;
  if (!videos?.length) return <div className="empty-state-container"><h2>لا توجد فيديوهات</h2><NavigationBar currentPage="home" /></div>;

  return (
    <div className="home-page-container">
      {/* النصف العلوي - الفيديو الأساسي */}
      <div className="top-half">
        <Swiper
          direction="vertical"
          slidesPerView={1}
          mousewheel
          keyboard
          modules={[Mousewheel, Keyboard]}
          onSwiper={(swiper) => {
            mainSwiperRef.current = swiper;
          }}
          onSlideChange={(swiper) => {
            setActiveVideoIndex(swiper.activeIndex);
            setActiveReplyIndex(0);
          }}
          className="main-video-swiper"
        >
          {videos.map((video, index) => (
            <SwiperSlide key={video._id}>
              <div className="video-wrapper">
                <VideoPlayerSplit
                  videoUrl={video.videoUrl}
                  isActive={index === activeVideoIndex}
                  autoPlay={true}
                  showPlayButton={true}
                  className="full-video"
                />

                {/* صورة البروفايل */}
                <div 
                  className="profile-avatar"
                  onClick={() => navigateToProfile(video.user.username)}
                >
                  <img src={video.user.profileImage || '/default-avatar.png'} alt={video.user.username} />
                </div>

                {/* أزرار التفاعل */}
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

                {/* معلومات الفيديو */}
                <div className="video-info">
                  <p className="video-description">{video.description}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* النصف السفلي - الردود */}
      <div className="bottom-half">
        {currentVideo?.replies?.length > 0 ? (
          <>
            <Swiper
              spaceBetween={0}
              slidesPerView={1}
              navigation={{
                prevEl: '.reply-prev',
                nextEl: '.reply-next'
              }}
              modules={[Navigation]}
              onSlideChange={(s) => setActiveReplyIndex(s.activeIndex)}
              className="replies-swiper"
            >
              {currentVideo.replies.map((reply, index) => (
                <SwiperSlide key={reply._id}>
                  <div className="reply-wrapper">
                    <VideoPlayerSplit
                      videoUrl={reply.videoUrl}
                      isActive={index === activeReplyIndex}
                      autoPlay={true}
                      showPlayButton={true}
                      className="full-video"
                    />

                    {/* صورة بروفايل الرد */}
                    <div 
                      className="profile-avatar reply-avatar"
                      onClick={() => navigateToProfile(reply.user.username)}
                    >
                      <img src={reply.user.profileImage || '/default-avatar.png'} alt={reply.user.username} />
                    </div>

                    {/* زر الإعجاب للرد */}
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
            </Swiper>
            
            {/* أزرار التنقل للردود */}
            <button className="reply-nav reply-prev"><FaChevronRight /></button>
            <button className="reply-nav reply-next"><FaChevronLeft /></button>
          </>
        ) : (
          <div className="no-replies-container">
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
