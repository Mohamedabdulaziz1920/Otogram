import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import VideoPlayer from './VideoPlayer';
import 'swiper/css';
import 'swiper/css/navigation';
import './ReplySwiper.css';

const ReplySwiper = ({ replies, parentVideoId, onDelete }) => {
  const [activeReplyIndex, setActiveReplyIndex] = useState(0);

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
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ReplySwiper;