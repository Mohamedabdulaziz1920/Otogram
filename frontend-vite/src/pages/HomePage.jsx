import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard, Navigation } from 'swiper';
import { FaHeart, FaReply, FaChevronLeft, FaChevronRight, FaPlay } from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import VideoPlayerSplit from '../components/VideoPlayerSplit';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import 'swiper/css';
import 'swiper/css/navigation';
import './HomePage.css';

const HomePage = () => {
  // ... (نفس State Management)

  // تحديث في JSX - استبدل video tags بـ VideoPlayerSplit:

  return (
    <div className="home-page-split">
      {/* النصف العلوي - الفيديو الأساسي */}
      <div className="main-video-section">
        <Swiper
          direction="vertical"
          slidesPerView={1}
          mousewheel={true}
          keyboard={true}
          modules={[Mousewheel, Keyboard]}
          onSlideChange={(swiper) => {
            setActiveVideoIndex(swiper.activeIndex);
            setActiveReplyIndex(0);
          }}
          className="main-video-swiper"
        >
          {videos.map((video, index) => (
            <SwiperSlide key={video._id}>
              <div className="main-video-container">
                <VideoPlayerSplit
                  videoUrl={video.videoUrl}
                  isActive={index === activeVideoIndex}
                  className="main-video"
                  showPlayButton={true}
                />
                
                {/* صورة الملف الشخصي - الزاوية اليمنى العلوية */}
                <div 
                  className="profile-avatar top-right"
                  onClick={() => navigateToProfile(video.user.username)}
                >
                  <img 
                    src={getProfileImageUrl(video.user)} 
                    alt={video.user.username}
                    onError={(e) => {
                      e.target.src = '/default-avatar.png';
                    }}
                  />
                </div>

                {/* أزرار التفاعل - الزاوية اليمنى السفلية */}
                <div className="main-video-actions">
                  <button 
                    className={`action-btn ${likedVideos.has(video._id) ? 'liked' : ''}`}
                    onClick={() => handleLikeMainVideo(video._id)}
                  >
                    <FaHeart />
                    <span>{video.likes?.length || 0}</span>
                  </button>
                  
                  <button 
                    className="action-btn reply-btn"
                    onClick={() => handleReply(video._id)}
                  >
                    <FaReply />
                    <span>رد</span>
                  </button>
                </div>

                {/* معلومات الفيديو */}
                <div className="main-video-info">
                  <p className="video-description">{video.description}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* النصف السفلي - الردود */}
      <div className="replies-section-split">
        {currentVideo?.replies && currentVideo.replies.length > 0 ? (
          <>
            <div className="replies-header">
              <h3>الردود ({currentVideo.replies.length})</h3>
            </div>
            
            <Swiper
              spaceBetween={10}
              slidesPerView={1.5}
              centeredSlides={true}
              navigation={{
                prevEl: '.swiper-button-prev-custom',
                nextEl: '.swiper-button-next-custom',
              }}
              modules={[Navigation]}
              onSlideChange={(swiper) => setActiveReplyIndex(swiper.activeIndex)}
              className="replies-swiper"
            >
              {currentVideo.replies.map((reply, index) => (
                <SwiperSlide key={reply._id}>
                  <div className="reply-video-container">
                    <VideoPlayerSplit
                      videoUrl={reply.videoUrl}
                      isActive={index === activeReplyIndex}
                      className="reply-video"
                      showPlayButton={true}
                    />
                    
                    {/* صورة الملف الشخصي - الزاوية اليمنى العلوية */}
                    <div 
                      className="profile-avatar top-right small"
                      onClick={() => navigateToProfile(reply.user.username)}
                    >
                      <img 
                        src={getProfileImageUrl(reply.user)} 
                        alt={reply.user.username}
                        onError={(e) => {
                          e.target.src = '/default-avatar.png';
                        }}
                      />
                    </div>

                    {/* زر الإعجاب - الزاوية اليسرى السفلية */}
                    <div className="reply-video-actions">
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

            {/* أزرار التنقل المخصصة */}
            <button className="swiper-button-prev-custom">
              <FaChevronRight />
            </button>
            <button className="swiper-button-next-custom">
              <FaChevronLeft />
            </button>
          </>
        ) : (
          <div className="no-replies">
            <p>لا توجد ردود حتى الآن</p>
            <button className="btn btn-primary" onClick={() => handleReply(currentVideo?._id)}>
              كن أول من يرد
            </button>
          </div>
        )}
      </div>

      <NavigationBar currentPage="home" />
    </div>
  );
};

// إضافة helper functions
const getProfileImageUrl = (user) => {
  if (!user?.profileImage) return '/default-avatar.png';
  if (user.profileImage.startsWith('http')) return user.profileImage;
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return `${baseURL}${user.profileImage}`;
};

export default HomePage;
