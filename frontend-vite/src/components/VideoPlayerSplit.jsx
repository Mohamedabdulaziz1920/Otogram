import React, { useRef, useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import './VideoPlayerSplit.css';

const VideoPlayerSplit = ({ 
  videoUrl, 
  isActive, 
  onPlay, 
  onPause,
  className = '',
  showPlayButton = true
}) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (videoRef.current && isActive) {
      videoRef.current.play().catch(err => {
        console.log('Play error:', err);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    } else if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
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

  const openFullscreen = (e) => {
    e.stopPropagation();
    setShowFullscreen(true);
    // إيقاف الفيديو الأصلي
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const closeFullscreen = () => {
    setShowFullscreen(false);
    // استئناف التشغيل إذا كان نشطاً
    if (isActive && videoRef.current) {
      videoRef.current.play();
    }
  };

  const handleVideoError = () => {
    setVideoError(true);
    console.error('Video failed to load:', videoUrl);
  };

  const getVideoUrl = () => {
    if (!videoUrl) return '';
    if (videoUrl.startsWith('http')) return videoUrl;
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseURL}${videoUrl}`;
  };

  return (
    <>
      <div className={`video-player-split ${className}`} onClick={openFullscreen}>
        {!videoError ? (
          <>
            <video
              ref={videoRef}
              src={getVideoUrl()}
              loop
              muted
              playsInline
              className="video-element-split"
              onError={handleVideoError}
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
            />
            {showPlayButton && !isPlaying && (
              <div className="play-overlay">
                <div className="play-button">▶</div>
              </div>
            )}
          </>
        ) : (
          <div className="video-error">
            <p>فشل تحميل الفيديو</p>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <div className="fullscreen-modal" onClick={closeFullscreen}>
          <div className="fullscreen-video-container">
            <video
              src={getVideoUrl()}
              controls
              autoPlay
              className="fullscreen-video"
              onClick={(e) => e.stopPropagation()}
            />
            <button className="fullscreen-close" onClick={closeFullscreen}>
              <FaTimes />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default VideoPlayerSplit;
