import React, { useState, useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper';
import VideoPlayerSplit from './VideoPlayerSplit';
import 'swiper/css';
import 'swiper/css/navigation';
import './ReplySwiper.css';

const ReplySwiper = ({ replies, parentVideoOwner, activeIndex = 0, onLikeReply, onProfileClick }) => {
  const [activeReplyIndex, setActiveReplyIndex] = useState(activeIndex);
  const swiperRef = useRef(null);

  useEffect(() => {
    setActiveReplyIndex(activeIndex);
  }, [activeIndex]);

  // تحديث الفيديوهات عند تغير index
  useEffect(() => {
    swiperRef.current?.slideTo(activeReplyIndex);
  }, [activeReplyIndex]);

  return (
    <div className="reply-swiper-container">
      <div className="reply-indicator">
        <span>الردود ({replies.length})</span>
      </div>

      <Swiper
        direction="horizontal"
        slidesPerView={1}
        navigation={true}
        modules={[Navigation]}
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        onSlideChange={(swiper) => setActiveReplyIndex(swiper.activeIndex)}
        className="reply-swiper"
      >
        {replies.map((reply, index) => (
          <SwiperSlide key={reply._id}>
            <div className="reply-slide-wrapper">
              <VideoPlayerSplit
                videoUrl={reply.videoUrl}
                isActive={index === activeReplyIndex}
                autoPlay={true}
                showPlayButton={true}
              />

              <div 
                className="profile-avatar reply-avatar"
                onClick={() => onProfileClick(reply.user.username)}
              >
                <img 
                  src={reply.user.profileImage || '/default-avatar.png'} 
                  alt={reply.user.username} 
                />
              </div>

              <div className="reply-actions">
                <button
                  className={`action-btn ${reply.liked ? 'liked' : ''}`}
                  onClick={() => onLikeReply(reply._id)}
                >
                  <span>❤️</span>
                  <span>{reply.likes?.length || 0}</span>
                </button>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ReplySwiper;
