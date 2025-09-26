import React, { useRef, useEffect, useState } from 'react';
import './VideoPlayerSplit.css';

const VideoPlayerSplit = ({ 
  videoUrl, 
  isActive, 
  onPlay, 
  onPause,
  className = '' 
}) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(err => console.log('Play error:', err));
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
        onPlay?.();
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
        onPause?.();
      }
    }
  };

  return (
    <div className={`video-player-split ${className}`} onClick={togglePlay}>
      <video
        ref={videoRef}
        src={videoUrl}
        loop
        muted
        playsInline
        className="video-element-split"
      />
      {!isPlaying && (
        <div className="play-overlay">
          <div className="play-button">▶</div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayerSplit;
