import React, { useRef, useEffect, useState } from 'react';
import { FaPlay } from 'react-icons/fa';
import './VideoPlayer.css';

const VideoPlayer = ({ src, isActive }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isActive) {
      videoElement.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    } else {
      videoElement.pause();
      if (videoElement.currentTime !== 0) {
        videoElement.currentTime = 0;
      }
      setIsPlaying(false);
    }
  }, [isActive, src]);

  const togglePlay = (e) => {
    e.stopPropagation();
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
        muted
        playsInline
        className="video-element"
      />
      {!isPlaying && isActive && <div className="play-indicator"><FaPlay /></div>}
    </div>
  );
};

export default VideoPlayer;
