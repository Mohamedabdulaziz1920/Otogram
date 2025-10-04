import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Mousewheel } from 'swiper';
import VideoPlayerSplit from './VideoPlayerSplit';
import '../HomePage.css';
import 'swiper/css';
import 'swiper/css/navigation';
import './ReplySwiper.css';

const ReplySwiper = ({ replies, parentVideoOwner, onDelete }) => {
  const [activeReplyIndex, setActiveReplyIndex] = useState(0);

  // إيقاف جميع الفيديوهات عند إلغاء المكون
  useEffect(() => {
    return () => {
      // التعامل مع هذا يتم داخل VideoPlayerSplit
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
        mousewheel={{ forceToAxis: true }} // ✅ السحب العمودي مفعل
        modules={[Navigation, Mousewheel]}
        onSlideChange={(swiper) => setActiveReplyIndex(swiper.activeIndex)}
        className="reply-swiper"
      >
        {replies.map((reply, index) => (
          <SwiperSlide key={reply._id}>
            <VideoPlayerSplit
              videoUrl={reply.videoUrl}
              onDelete={onDelete}
              isActive={index === activeReplyIndex}
              parentVideoOwner={parentVideoOwner}
              autoPlay={true}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ReplySwiper;
