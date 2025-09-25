import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './UploadPage.css';

const UploadPage = () => {
  const [searchParams] = useSearchParams();
  const replyToId = searchParams.get('replyTo');
  
  const [videoFile, setVideoFile] = useState(null);
  const [description, setDescription] = useState('');
  const [creatorPassword, setCreatorPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setPreview(URL.createObjectURL(file));
    } else {
      setError('يرجى اختيار ملف فيديو صحيح');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!videoFile) {
      setError('يرجى اختيار فيديو');
      return;
    }

    // Check if it's a main video and creator password is required
    if (!replyToId && user.isCreator && !creatorPassword) {
      setError('يرجى إدخال كلمة مرور المنشئ');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('description', description);
    
    if (!replyToId && user.isCreator) {
      formData.append('creatorPassword', creatorPassword);
    }

    try {
      let response;
      if (replyToId) {
        // Upload as reply
        response = await axios.post(`/api/videos/reply/${replyToId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Upload as main video
        response = await axios.post('/api/videos/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      navigate('/');
    } catch (error) {
      setError(error.response?.data?.error || 'فشل رفع الفيديو');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-page">
      <div className="upload-container">
        <h1>{replyToId ? 'رفع رد على الفيديو' : 'رفع فيديو جديد'}</h1>

        <form onSubmit={handleSubmit}>
          <div className="video-upload-area">
            {preview ? (
              <div className="video-preview">
                <video src={preview} controls />
                <button 
                  type="button" 
                  className="change-video-btn"
                  onClick={() => {
                    setVideoFile(null);
                    setPreview(null);
                  }}
                >
                  تغيير الفيديو
                </button>
              </div>
            ) : (
              <label htmlFor="video-input" className="upload-label">
                <div className="upload-icon">📹</div>
                <p>اضغط لاختيار فيديو</p>
                <input
                  id="video-input"
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  hidden
                />
              </label>
            )}
          </div>

          <div className="form-group">
            <label>الوصف (اختياري)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="أضف وصفاً للفيديو..."
              rows="3"
            />
          </div>

          {!replyToId && user?.isCreator && (
            <div className="form-group">
              <label>كلمة مرور المنشئ</label>
              <input
                type="password"
                value={creatorPassword}
                onChange={(e) => setCreatorPassword(e.target.value)}
                placeholder="أدخل كلمة مرور المنشئ"
                required
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={uploading || !videoFile}
          >
            {uploading ? 'جاري الرفع...' : 'رفع الفيديو'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadPage;