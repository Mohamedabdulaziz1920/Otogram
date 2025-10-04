import React, { useRef, useEffect, useState } from 'react';
import { FaTimes, FaPlay } from 'react-icons/fa';
import './VideoPlayerSplit.css';

const VideoPlayerSplit = ({ 
  videoUrl, 
  isActive, 
  autoPlay = false,
  showPlayButton = true
}) => {
  const videoRef = useRef(null);
  const fullscreenVideoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && autoPlay) {
      videoRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive, autoPlay]);

  const togglePlay = (e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const openFullscreen = () => {
    setShowFullscreen(true);
    videoRef.current?.pause();
    setTimeout(() => fullscreenVideoRef.current?.play(), 50);
  };

  const closeFullscreen = () => {
    setShowFullscreen(false);
    fullscreenVideoRef.current?.pause();
    setTimeout(() => isActive && autoPlay && videoRef.current?.play(), 50);
  };

  const handleVideoError = () => {
    setVideoError(true);
    setIsLoading(false);
  };

  const handleVideoLoaded = () => setIsLoading(false);

  const getVideoUrl = () => {
    if (!videoUrl) return '';
    if (videoUrl.startsWith('http')) return videoUrl;
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseURL}${videoUrl}`;
  };

  return (
    <>
      <div className={`video-player-split ${isPlaying ? 'playing' : ''} ${isLoading ? 'loading' : ''}`} onClick={openFullscreen}>
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
            />
            {isLoading && <div className="video-loading"></div>}

            {showPlayButton && !isPlaying && !isLoading && (
              <div className="play-overlay" onClick={togglePlay}>
                <div className="play-button"><FaPlay /></div>
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
              />
              <button className="fullscreen-close-btn" onClick={closeFullscreen} aria-label="إغلاق"><FaTimes /></button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default VideoPlayerSplit;
