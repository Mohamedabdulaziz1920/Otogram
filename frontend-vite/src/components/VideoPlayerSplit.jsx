import React, { useRef, useEffect, useState } from 'react';
import { FaTimes, FaPlay } from 'react-icons/fa';
import '../HomePage.css';
import './VideoPlayerSplit.css';

const VideoPlayerSplit = ({ 
  videoUrl, 
  isActive, 
  onPlay, 
  onPause,
  className = '',
  showPlayButton = true,
  autoPlay = true
}) => {
  const videoRef = useRef(null);
  const fullscreenVideoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive && autoPlay) {
        playVideo();
      } else {
        pauseVideo();
      }
    }
  }, [isActive, autoPlay]);

  const playVideo = () => {
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          onPlay?.();
        })
        .catch(err => {
          console.log('Play error:', err);
          setIsPlaying(false);
        });
    }
  };

  const pauseVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      onPause?.();
    }
  };

  const togglePlay = (e) => {
    e?.stopPropagation();
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  };

  const openFullscreen = () => {
    setShowFullscreen(true);
    pauseVideo();
    setTimeout(() => {
      fullscreenVideoRef.current?.play();
    }, 100);
  };

  const closeFullscreen = () => {
    setShowFullscreen(false);
    fullscreenVideoRef.current?.pause();
    if (isActive && autoPlay) setTimeout(() => playVideo(), 100);
  };

  const handleVideoError = () => {
    setVideoError(true);
    setIsLoading(false);
    console.error('Video failed to load:', videoUrl);
  };

  const handleVideoLoaded = () => {
    setIsLoading(false);
  };

  const getVideoUrl = () => {
    if (!videoUrl) return '';
    if (videoUrl.startsWith('http')) return videoUrl;
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseURL}${videoUrl}`;
  };

  return (
    <>
      <div 
        className={`video-player-split ${className} ${isPlaying ? 'playing' : ''} ${isLoading ? 'loading' : ''}`} 
        onClick={openFullscreen}
      >
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
              onLoadedData={handleVideoLoaded}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            
            {isLoading && <div className="video-loading"></div>}
            
            {showPlayButton && !isPlaying && !isLoading && (
              <div className="play-overlay" onClick={togglePlay}>
                <div className="play-button">
                  <FaPlay />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="video-error">
            <p>فشل تحميل الفيديو</p>
          </div>
        )}
      </div>

      {showFullscreen && (
        <>
          <div className="fullscreen-backdrop" onClick={closeFullscreen} />
          <div className="fullscreen-container">
            <div className="fullscreen-video-wrapper">
              <video
                ref={fullscreenVideoRef}
                src={getVideoUrl()}
                controls
                autoPlay
                className="fullscreen-video"
                onClick={(e) => e.stopPropagation()}
              />
              
              <button 
                className="fullscreen-close-btn" 
                onClick={closeFullscreen}
                aria-label="إغلاق"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default VideoPlayerSplit;
