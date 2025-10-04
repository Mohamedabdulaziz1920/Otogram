import React, { useRef, useEffect, useState } from 'react';
import { FaPlay } from 'react-icons/fa';
import './VideoPlayer.css'; // سنستخدم ملف تنسيق بسيط خاص به

const VideoPlayer = ({ src, isActive }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // هذا الـ Hook هو المسؤول عن التحكم في التشغيل
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isActive) {
      // حاول تشغيل الفيديو إذا كان نشطًا
      videoElement.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // فشل التشغيل التلقائي (شائع في المتصفحات)
        setIsPlaying(false);
      });
    } else {
      // أوقف الفيديو وأعده للبداية إذا لم يكن نشطًا
      videoElement.pause();
      if (videoElement.currentTime !== 0) {
        videoElement.currentTime = 0;
      }
      setIsPlaying(false);
    }
  }, [isActive, src]); // يعتمد على حالة النشاط ومصدر الفيديو

  // وظيفة للتشغيل/الإيقاف عند النقر
  const togglePlay = (e) => {
    e.stopPropagation(); // منع انتشار النقرة للعناصر الخلفية
    const videoElement = videoRef.current;
    if (videoElement) {
      if (videoElement.paused) {
        videoElement.play().then(() => setIsPlaying(true));
      } else {
        videoElement.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className="player-wrapper" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={src}
        loop
        muted // ✨ مهم: التشغيل التلقائي غالبًا ما يتطلب أن يكون الفيديو صامتًا في البداية
        playsInline // مهم جدًا للتشغيل التلقائي على أجهزة iOS
        className="video-element"
      />
      {/* إظهار أيقونة التشغيل فقط إذا كان الفيديو متوقفًا وهو نشط */}
      {!isPlaying && isActive && <div className="play-indicator"><FaPlay /></div>}
    </div>
  );
};

export default VideoPlayer;
