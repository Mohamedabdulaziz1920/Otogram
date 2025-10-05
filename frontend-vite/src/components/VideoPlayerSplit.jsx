import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FaTimes, FaPlay, FaPause, FaExpand } from 'react-icons/fa';
import './VideoPlayerSplit.css';

const VideoPlayerSplit = ({ 
  videoUrl, 
  isActive = true, 
  autoPlay = true,
  showPlayButton = false,
  muted = false,
  onPlayStateChange = null,
  className = '',
  fullscreenEnabled = true
}) => {
  const videoRef = useRef(null);
  const fullscreenVideoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Handle video play/pause based on isActive prop
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isActive && autoPlay) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            if (onPlayStateChange) onPlayStateChange(true);
          })
          .catch((error) => {
            console.log('Auto-play prevented:', error);
            setIsPlaying(false);
            if (onPlayStateChange) onPlayStateChange(false);
          });
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      if (onPlayStateChange) onPlayStateChange(false);
    }
  }, [isActive, autoPlay, onPlayStateChange]);

  // Update muted state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
    if (fullscreenVideoRef.current) {
      fullscreenVideoRef.current.muted = muted;
    }
  }, [muted]);

  // Toggle play/pause
  const togglePlay = useCallback((e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          if (onPlayStateChange) onPlayStateChange(true);
        })
        .catch((error) => {
          console.error('Play failed:', error);
          setIsPlaying(false);
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      if (onPlayStateChange) onPlayStateChange(false);
    }
  }, [onPlayStateChange]);

  // Open fullscreen
  const openFullscreen = useCallback(() => {
    if (!fullscreenEnabled) return;
    
    setShowFullscreen(true);
    if (videoRef.current) {
      const currentTimeTemp = videoRef.current.currentTime;
      videoRef.current.pause();
      
      setTimeout(() => {
        if (fullscreenVideoRef.current) {
          fullscreenVideoRef.current.currentTime = currentTimeTemp;
          fullscreenVideoRef.current.play();
        }
      }, 100);
    }
  }, [fullscreenEnabled]);

  // Close fullscreen
  const closeFullscreen = useCallback(() => {
    setShowFullscreen(false);
    if (fullscreenVideoRef.current) {
      const currentTimeTemp = fullscreenVideoRef.current.currentTime;
      fullscreenVideoRef.current.pause();
      
      setTimeout(() => {
        if (videoRef.current && isActive && autoPlay) {
          videoRef.current.currentTime = currentTimeTemp;
          videoRef.current.play();
        }
      }, 100);
    }
  }, [isActive, autoPlay]);

  // Handle video error
  const handleVideoError = useCallback((error) => {
    console.error('Video error:', error);
    setVideoError(true);
    setIsLoading(false);
  }, []);

  // Handle video loaded
  const handleVideoLoaded = useCallback(() => {
    setIsLoading(false);
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  // Handle time update
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  // Get video URL
  const getVideoUrl = useCallback(() => {
    if (!videoUrl) return '';
    if (videoUrl.startsWith('http')) return videoUrl;
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseURL}${videoUrl}`;
  }, [videoUrl]);

  // Format time
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <div 
        ref={containerRef}
        className={`video-player-split ${className} ${isPlaying ? 'playing' : ''} ${isLoading ? 'loading' : ''}`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onClick={showPlayButton ? undefined : togglePlay}
      >
        {!videoError ? (
          <>
            <video
              ref={videoRef}
              src={getVideoUrl()}
              loop
              muted={muted}
              playsInline
              webkit-playsinline="true"
              x5-playsinline="true"
              className="video-element-split"
              onError={handleVideoError}
              onLoadedData={handleVideoLoaded}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Loading indicator */}
            {isLoading && (
              <div className="video-loading">
                <div className="loading-spinner"></div>
              </div>
            )}

            {/* Play button overlay */}
            {showPlayButton && !isLoading && (
              <div 
                className={`play-overlay ${showControls || !isPlaying ? 'visible' : ''}`}
                onClick={togglePlay}
              >
                <button className="play-button">
                  {isPlaying ? <FaPause /> : <FaPlay />}
                </button>
              </div>
            )}

            {/* Progress bar */}
            {!isLoading && showControls && (
              <div className="video-progress">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
              </div>
            )}

            {/* Fullscreen button */}
            {fullscreenEnabled && !isLoading && showControls && (
              <button 
                className="fullscreen-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openFullscreen();
                }}
              >
                <FaExpand />
              </button>
            )}

            {/* Time display */}
            {!isLoading && showControls && duration > 0 && (
              <div className="time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            )}
          </>
        ) : (
          <div className="video-error">
            <div className="error-content">
              <div className="error-icon">⚠️</div>
              <p>فشل تحميل الفيديو</p>
              <button 
                className="retry-btn"
                onClick={() => {
                  setVideoError(false);
                  setIsLoading(true);
                }}
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
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
                onError={handleVideoError}
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