import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper';
import VideoPlayer from './VideoPlayer';
import 'swiper/css';
import 'swiper/css/navigation';
import './ReplySwiper.css';

const ReplySwiper = ({ replies, parentVideoOwner, onDelete }) => {
  const [activeReplyIndex, setActiveReplyIndex] = useState(0);

  // إيقاف جميع الفيديوهات عند إلغاء المكون
  useEffect(() => {
    return () => {
      // سيتم التعامل مع هذا في VideoPlayer
    };
  }, []);

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
        onSlideChange={(swiper) => setActiveReplyIndex(swiper.activeIndex)}
        className="reply-swiper"
      >
        {replies.map((reply, index) => (
          <SwiperSlide key={reply._id}>
            <VideoPlayer
              video={reply}
              onDelete={onDelete}
              isActive={index === activeReplyIndex}
              parentVideoOwner={parentVideoOwner}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ReplySwiper;
