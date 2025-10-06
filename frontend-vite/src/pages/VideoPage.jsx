import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { FaHeart, FaComment, FaShare, FaArrowLeft, FaPlay } from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import './VideoPage.css';

const VideoPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef(null);

  const [video, setVideo] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(false);

  const getAssetUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
  };

  useEffect(() => {
    fetchVideoData();
  }, [videoId]);

  const fetchVideoData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/videos/${videoId}`);
      setVideo(response.data);
      setReplies(response.data.replies || []);
      setLiked(response.data.likes?.includes(user?._id || user?.id));
    } catch (error) {
      console.error('Error fetching video:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const response = await api.post(`/api/videos/${videoId}/like`);
      setLiked(response.data.liked);
      setVideo(prev => ({
        ...prev,
        likes: response.data.liked 
          ? [...(prev.likes || []), user._id || user.id]
          : (prev.likes || []).filter(id => id !== (user._id || user.id))
      }));
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleReply = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/upload?replyTo=${videoId}`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="error-container">
        <h2>الفيديو غير موجود</h2>
        <button onClick={() => navigate(-1)}>العودة</button>
      </div>
    );
  }

  return (
    <div className="video-page">
      <div className="video-page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h2>الفيديو</h2>
      </div>

      <div className="video-page-content">
        {/* Video Section */}
        <div className="main-video-section">
          <div className="video-container" onClick={togglePlay}>
            <video
              ref={videoRef}
              src={getAssetUrl(video.videoUrl)}
              className="main-video"
              loop
              playsInline
              onEnded={() => setIsPlaying(false)}
            />
            {!isPlaying && (
              <div className="play-overlay">
                <FaPlay size={50} />
              </div>
            )}
          </div>

          <div className="video-info">
            <div className="user-info" onClick={() => navigate(`/profile/${video.user.username}`)}>
              <img 
                src={getAssetUrl(video.user.profileImage)} 
                alt={video.user.username}
                className="user-avatar"
              />
              <span className="username">@{video.user.username}</span>
            </div>
            {video.description && (
              <p className="description">{video.description}</p>
            )}
          </div>

          <div className="video-actions">
            <button 
              className={`action-btn ${liked ? 'liked' : ''}`}
              onClick={handleLike}
            >
              <FaHeart />
              <span>{video.likes?.length || 0}</span>
            </button>
            <button className="action-btn" onClick={handleReply}>
              <FaComment />
              <span>{replies.length}</span>
            </button>
            <button className="action-btn">
              <FaShare />
            </button>
          </div>
        </div>

        {/* Replies Section */}
        <div className="replies-section">
          <h3 className="replies-title">الردود ({replies.length})</h3>
          
          {replies.length > 0 ? (
            <div className="replies-list">
              {replies.map(reply => (
                <div key={reply._id} className="reply-card">
                  <video
                    src={getAssetUrl(reply.videoUrl)}
                    className="reply-video"
                    controls
                    playsInline
                  />
                  <div className="reply-info">
                    <div 
                      className="reply-user"
                      onClick={() => navigate(`/profile/${reply.user.username}`)}
                    >
                      <img 
                        src={getAssetUrl(reply.user.profileImage)} 
                        alt={reply.user.username}
                        className="reply-avatar"
                      />
                      <span>@{reply.user.username}</span>
                    </div>
                    {reply.description && (
                      <p className="reply-description">{reply.description}</p>
                    )}
                    <div className="reply-stats">
                      <span><FaHeart /> {reply.likes?.length || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-replies">
              <FaComment size={40} />
              <p>لا توجد ردود بعد</p>
              <button className="reply-btn" onClick={handleReply}>
                كن أول من يرد
              </button>
            </div>
          )}
        </div>
      </div>

      <NavigationBar />
    </div>
  );
};

export default VideoPage;
