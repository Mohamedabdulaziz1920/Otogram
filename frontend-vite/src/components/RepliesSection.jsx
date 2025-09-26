import React, { useState } from 'react';
import { FaTimes, FaPlay } from 'react-icons/fa';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper';
import VideoPlayer from './VideoPlayer';
import 'swiper/css';
import 'swiper/css/navigation';
import './RepliesSection.css';

const RepliesSection = ({ replies, parentVideo, parentVideoOwner, onDelete, onClose }) => {
  const [selectedReply, setSelectedReply] = useState(null);

  const handleReplyClick = (reply) => {
    setSelectedReply(reply);
  };

  const handleCloseFullscreen = () => {
    setSelectedReply(null);
  };

  const getVideoUrl = (video) => {
    if (video.videoUrl.startsWith('http')) {
      return video.videoUrl;
    }
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseURL}${video.videoUrl}`;
  };

  const getProfileImageUrl = (user) => {
    if (!user.profileImage) return '/default-avatar.png';
    if (user.profileImage.startsWith('http')) return user.profileImage;
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseURL}${user.profileImage}`;
  };

  return (
    <>
      <div className="replies-section">
        <div className="replies-header">
          <h3>الردود ({replies.length})</h3>
          <button className="close-replies" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className="replies-slider">
          <Swiper
            spaceBetween={10}
            slidesPerView={2.5}
            navigation={true}
            modules={[Navigation]}
            breakpoints={{
              320: {
                slidesPerView: 2,
                spaceBetween: 8
              },
              480: {
                slidesPerView: 2.5,
                spaceBetween: 10
              },
              640: {
                slidesPerView: 3,
                spaceBetween: 10
              },
              768: {
                slidesPerView: 3.5,
                spaceBetween: 12
              }
            }}
            className="replies-swiper"
          >
            {replies.map((reply) => (
              <SwiperSlide key={reply._id}>
                <div 
                  className="reply-thumbnail"
                  onClick={() => handleReplyClick(reply)}
                >
                  <video 
                    src={getVideoUrl(reply)}
                    muted
                    loop
                    onMouseEnter={(e) => e.target.play()}
                    onMouseLeave={(e) => e.target.pause()}
                  />
                  <div className="reply-overlay">
                    <FaPlay className="play-icon" />
                  </div>
                  <div className="reply-info">
                    <img 
                      src={getProfileImageUrl(reply.user)} 
                      alt={reply.user.username}
                      className="reply-user-avatar"
                    />
                    <span>@{reply.user.username}</span>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      {/* عرض الرد بملء الشاشة */}
      {selectedReply && (
        <div className="fullscreen-reply">
          <button className="close-fullscreen" onClick={handleCloseFullscreen}>
            <FaTimes />
          </button>
          <VideoPlayer
            video={selectedReply}
            onDelete={(videoId) => {
              onDelete(videoId);
              handleCloseFullscreen();
            }}
            isActive={true}
            parentVideoOwner={parentVideoOwner}
            isReply={true}
          />
        </div>
      )}
    </>
  );
};

export default RepliesSection;
