import React from 'react';
import { useNavigate } from 'react-router-dom';
import './VideoGrid.css';

const VideoGrid = ({ videos }) => {
  const navigate = useNavigate();

  const handleVideoClick = (video) => {
    // Navigate to video page or open in modal
    navigate(`/?video=${video._id}`);
  };

  return (
    <div className="video-grid">
      {videos.map((video) => (
        <div 
          key={video._id} 
          className="video-grid-item"
          onClick={() => handleVideoClick(video)}
        >
          <video 
            src={`http://localhost:5000${video.videoUrl}`}
            muted
            loop
            onMouseEnter={(e) => e.target.play()}
            onMouseLeave={(e) => e.target.pause()}
          />
          <div className="video-overlay">
            <span className="video-stat">
              ❤️ {video.likes?.length || 0}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VideoGrid;