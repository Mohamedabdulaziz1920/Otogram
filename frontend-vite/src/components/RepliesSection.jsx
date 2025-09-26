import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import VideoPlayer from './VideoPlayer';
import './RepliesSection.css';

const RepliesSection = ({ replies, parentVideoOwner, onDelete, onClose }) => {
  const [selectedReply, setSelectedReply] = useState(null);

  const handleReplyClick = (reply) => {
    setSelectedReply(reply);
  };

  const handleCloseFullscreen = () => {
    setSelectedReply(null);
  };

  return (
    <>
      <div className="replies-section">
        <div className="replies-header">
          <h3>الردود ({replies.length})</h3>
          <button className="close-replies" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className="replies-grid">
          {replies.map((reply) => (
            <div 
              key={reply._id} 
              className="reply-thumbnail"
              onClick={() => handleReplyClick(reply)}
            >
              <video 
                src={reply.videoUrl.startsWith('http') ? reply.videoUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${reply.videoUrl}`}
                poster={reply.thumbnail}
              />
              <div className="reply-info">
                <img 
                  src={reply.user.profileImage || '/default-avatar.png'} 
                  alt={reply.user.username}
                  className="reply-user-avatar"
                />
                <span>@{reply.user.username}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* عرض الرد بملء الشاشة */}
      {selectedReply && (
        <div className="fullscreen-reply">
          <button className="close-fullscreen" onClick={handleCloseFullscreen}>
            <FaTimes />
          </button>
          <VideoPlayer
            video={selectedReply}
            onDelete={onDelete}
            isActive={true}
            parentVideoOwner={parentVideoOwner}
          />
        </div>
      )}
    </>
  );
};

export default RepliesSection;
