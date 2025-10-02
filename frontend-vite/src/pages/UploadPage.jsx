import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import NavigationBar from '../components/NavigationBar';
import './UploadPage.css';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

const UploadPage = () => {
  const [searchParams] = useSearchParams();
  const replyToId = searchParams.get('replyTo');

  const [videoFile, setVideoFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const navigate = useNavigate();
  const { user } = useAuth();

  // إعادة توجيه إذا لم يكن المستخدم مسجلاً
  useEffect(() => {
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
      navigate('/login');
    }
  }, [user, navigate]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setError('');
      setPreview(URL.createObjectURL(file));
    } else {
      setVideoFile(null);
      setPreview(null);
      setError('يرجى اختيار ملف فيديو صحيح (مثل MP4, MOV)');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!videoFile) {
      setError('يرجى اختيار فيديو للرفع');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('description', description);

    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      };

      if (replyToId) {
        await api.post(`/api/videos/reply/${replyToId}`, formData, config);
      } else {
        await api.post('/api/videos/upload', formData, config);
      }

      navigate('/');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'حدث خطأ غير متوقع أثناء الرفع.';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-page">
      <div className="upload-container">
        <h1>{replyToId ? 'إضافة رد جديد' : 'نشر فيديو جديد'}</h1>

        <form onSubmit={handleSubmit}>
          {/* منطقة اختيار أو معاينة الفيديو */}
          <div className="video-upload-area">
            {preview ? (
              <div className="video-preview">
                <video src={preview} controls muted loop />
                <button 
                  type="button" 
                  className="change-video-btn"
                  onClick={() => {
                    setVideoFile(null);
                    setPreview(null);
                    document.getElementById('video-input').value = '';
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

          {/* وصف الفيديو */}
          <div className="form-group">
            <label htmlFor="description">الوصف (اختياري)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="أضف وصفاً جذاباً لفيديوك..."
              rows="3"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={uploading || !videoFile}
          >
            {uploading ? 'جاري النشر...' : 'نشر الفيديو'}
          </button>
        </form>
      </div>
      <NavigationBar currentPage="upload" />
    </div>
  );
};

export default UploadPage;
