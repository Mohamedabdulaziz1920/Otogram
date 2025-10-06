import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import OtogramIcon from '../components/OtogramIcon';
import NavigationBar from '../components/NavigationBar';
import { 
  Upload, 
  Video, 
  FileVideo, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw, 
  ArrowLeft,
  Sparkles,
  Film,
  MessageSquare,
  Play,
  Loader2,
  Music
} from 'lucide-react';
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const cancelTokenRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

  useEffect(() => {
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, [preview]);

  const validateFile = (file) => {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return 'نوع الملف غير مدعوم. يرجى اختيار MP4, MOV, AVI, أو WebM';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `حجم الملف كبير جداً. الحد الأقصى هو ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }
    return null;
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setVideoFile(null);
      setPreview(null);
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setVideoFile(file);
    setError('');
    setSuccess('');
    setPreview(URL.createObjectURL(file));
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const resetUpload = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setVideoFile(null);
    setPreview(null);
    setUploadProgress(0);
    setError('');
    setSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const cancelUpload = () => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Upload cancelled by user');
      setUploading(false);
      setUploadProgress(0);
      setError('تم إلغاء الرفع');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!videoFile) {
      setError('يرجى اختيار فيديو للرفع');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('description', description.trim());
    
    if (replyToId) {
      formData.append('replyToId', replyToId);
    }

    cancelTokenRef.current = axios.CancelToken.source();

    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        cancelToken: cancelTokenRef.current.token,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      };

      const endpoint = replyToId 
        ? `/api/videos/reply/${replyToId}` 
        : '/api/videos/upload';

      await api.post(endpoint, formData, config);

      setSuccess('تم رفع الفيديو بنجاح!');
      
      setTimeout(() => {
        navigate(replyToId ? `/video/${replyToId}` : '/');
      }, 1500);
      
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log('Upload cancelled:', err.message);
      } else {
        const errorMessage = err.response?.data?.error 
          || err.response?.data?.message 
          || 'حدث خطأ غير متوقع أثناء الرفع. يرجى المحاولة مرة أخرى.';
        setError(errorMessage);
      }
    } finally {
      setUploading(false);
      cancelTokenRef.current = null;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="upload-page">
      {/* خلفية TikTok المتحركة */}
      <div className="tiktok-background">
        <div className="neon-orb cyan-orb orb-1"></div>
        <div className="neon-orb pink-orb orb-2"></div>
        <div className="neon-orb cyan-orb orb-3"></div>
        <div className="grid-overlay"></div>
      </div>

      <div className="upload-container">
        {/* Header بأسلوب TikTok */}
        <div className="upload-header">
          <button className="tiktok-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          
          <div className="header-content">
            <div className="tiktok-icon-wrapper">
              {replyToId ? (
                <MessageSquare className="header-icon" size={36} strokeWidth={2} />
              ) : (
                <OtogramIcon className="header-icon" size={36} strokeWidth={2} />
              )}
              <div className="icon-glow"></div>
            </div>
            
            <h1 className="tiktok-title">
              {replyToId ? 'إضافة رد' : 'رفع فيديو'}
            </h1>
            
            <p className="tiktok-subtitle">
              {replyToId ? 'شارك ردك الإبداعي 🎬' : 'اصنع محتوى مميز ✨'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {/* منطقة رفع الفيديو */}
          <div className="video-upload-section">
            {preview ? (
              <div className="video-preview-card">
                <div className="preview-container">
                  <video 
                    src={preview} 
                    controls 
                    className="preview-video"
                    playsInline
                  />
                  <div className="play-overlay">
                    <div className="play-button">
                      <Play size={32} fill="white" />
                    </div>
                  </div>
                </div>
                
                <div className="video-info-card">
                  <div className="file-details">
                    <FileVideo className="file-icon cyan-icon" size={24} strokeWidth={2} />
                    <div className="file-meta">
                      <p className="file-name">{videoFile?.name}</p>
                      <p className="file-size">{formatFileSize(videoFile?.size || 0)}</p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    className="tiktok-btn-secondary"
                    onClick={resetUpload}
                    disabled={uploading}
                  >
                    <RefreshCw size={18} strokeWidth={2.5} />
                    تغيير
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className={`tiktok-drop-zone ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/webm" 
                  onChange={handleFileInputChange} 
                  hidden 
                />
                
                <div className="upload-visual">
                  <div className="upload-icon-ring">
                    <Upload className="upload-icon" size={52} strokeWidth={2} />
                    <div className="ring-pulse"></div>
                    <div className="ring-pulse ring-pulse-delayed"></div>
                  </div>
                </div>
                
                <h3 className="drop-zone-title">
                  اسحب الفيديو وأفلته هنا
                </h3>
                
                <p className="drop-zone-subtitle">
                  أو اضغط للاختيار من جهازك
                </p>
                
                <div className="format-badge">
                  <Film size={16} strokeWidth={2.5} />
                  <span>MP4, MOV, WebM • حتى 100MB</span>
                </div>
              </div>
            )}
          </div>

          {/* حقل الوصف */}
          <div className="tiktok-form-group">
            <label htmlFor="description" className="tiktok-label">
              <Video size={20} strokeWidth={2.5} />
              <span>أضف وصفاً</span>
              <span className="optional-tag">اختياري</span>
            </label>
            
            <div className="textarea-container">
              <textarea
                id="description"
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setDescription(e.target.value);
                  }
                }}
                placeholder="اكتب شيئاً مميزاً... #viral #فيديو 🔥"
                rows="4"
                disabled={uploading}
                className="tiktok-textarea"
              />
              
              <div className="char-badge">
                <span className={description.length > 450 ? 'warning' : ''}>
                  {description.length}
                </span>
                <span className="separator">/</span>
                <span className="max">500</span>
              </div>
            </div>
          </div>

          {/* شريط التقدم */}
          {uploading && (
            <div className="tiktok-progress-card">
              <div className="progress-header">
                <div className="progress-info">
                  <Loader2 className="spinning cyan-icon" size={20} strokeWidth={2.5} />
                  <span className="progress-text">جاري الرفع...</span>
                </div>
                <span className="progress-percent">{uploadProgress}%</span>
              </div>
              
              <div className="tiktok-progress-bar">
                <div 
                  className="progress-fill-gradient" 
                  style={{ width: `${uploadProgress}%` }}
                >
                  <div className="progress-shimmer"></div>
                </div>
              </div>
              
              <p className="progress-note">
                لا تغلق الصفحة حتى انتهاء الرفع
              </p>
            </div>
          )}

          {/* رسائل التنبيه */}
          {error && (
            <div className="tiktok-alert error-alert">
              <AlertCircle size={20} strokeWidth={2.5} />
              <span>{error}</span>
              <button 
                type="button" 
                className="alert-close-btn"
                onClick={() => setError('')}
              >
                <X size={18} />
              </button>
            </div>
          )}
          
          {success && (
            <div className="tiktok-alert success-alert">
              <CheckCircle2 size={20} strokeWidth={2.5} />
              <span>{success}</span>
            </div>
          )}

          {/* أزرار التحكم */}
          <div className="tiktok-actions">
            {uploading ? (
              <button 
                type="button" 
                className="tiktok-btn-danger" 
                onClick={cancelUpload}
              >
                <X size={20} strokeWidth={2.5} />
                إلغاء الرفع
              </button>
            ) : (
              <>
                <button 
                  type="submit" 
                  className="tiktok-btn-primary" 
                  disabled={!videoFile}
                >
                  <Sparkles size={20} strokeWidth={2.5} />
                  <span>نشر الفيديو</span>
                  <div className="btn-glow"></div>
                </button>
                
                <button 
                  type="button" 
                  className="tiktok-btn-ghost" 
                  onClick={() => navigate(-1)}
                >
                  إلغاء
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      <NavigationBar currentPage="upload" />
    </div>
  );
};


export default UploadPage;
