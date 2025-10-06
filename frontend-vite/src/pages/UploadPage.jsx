import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
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
  Loader2
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

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
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
      {/* خلفية متحركة */}
      <div className="animated-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="upload-container">
        {/* Header */}
        <div className="upload-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div className="header-content">
            <div className="icon-wrapper">
              {replyToId ? (
                <MessageSquare className="header-icon" size={32} />
              ) : (
                <Sparkles className="header-icon" size={32} />
              )}
            </div>
            <h1 className="upload-title">
              {replyToId ? 'إضافة رد جديد' : 'نشر فيديو جديد'}
            </h1>
            <p className="upload-subtitle">
              {replyToId ? 'شارك ردك مع المجتمع' : 'شارك إبداعك مع العالم'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {/* منطقة رفع الفيديو */}
          <div className="video-upload-section">
            {preview ? (
              <div className="video-preview-container">
                <div className="preview-wrapper">
                  <video 
                    src={preview} 
                    controls 
                    className="preview-video"
                  />
                  <div className="video-overlay">
                    <Play className="play-icon" size={48} />
                  </div>
                </div>
                
                <div className="video-details">
                  <div className="file-info">
                    <FileVideo className="file-icon" size={24} />
                    <div className="file-text">
                      <p className="file-name">{videoFile?.name}</p>
                      <p className="file-size">{formatFileSize(videoFile?.size || 0)}</p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    className="change-video-btn"
                    onClick={resetUpload}
                    disabled={uploading}
                  >
                    <RefreshCw size={18} />
                    تغيير الفيديو
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className={`upload-drop-zone ${isDragging ? 'dragging' : ''}`}
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
                
                <div className="upload-icon-container">
                  <div className="upload-icon-bg">
                    <Upload className="upload-icon" size={48} />
                  </div>
                  <div className="icon-pulse"></div>
                </div>
                
                <h3 className="upload-main-text">
                  اسحب وأفلت الفيديو هنا
                </h3>
                <p className="upload-sub-text">
                  أو اضغط للاختيار من جهازك
                </p>
                
                <div className="supported-formats">
                  <Film size={16} />
                  <span>MP4, MOV, AVI, WebM (حتى 100MB)</span>
                </div>
              </div>
            )}
          </div>

          {/* وصف الفيديو */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              <Video size={20} />
              وصف الفيديو
              <span className="optional-badge">اختياري</span>
            </label>
            <div className="textarea-wrapper">
              <textarea
                id="description"
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setDescription(e.target.value);
                  }
                }}
                placeholder="أضف وصفاً جذاباً لفيديوك... اجعله مميزاً! ✨"
                rows="4"
                disabled={uploading}
                className="form-textarea"
              />
              <div className="char-counter">
                <span className={description.length > 450 ? 'warning' : ''}>
                  {description.length}/500
                </span>
              </div>
            </div>
          </div>

          {/* شريط التقدم */}
          {uploading && (
            <div className="upload-progress-container">
              <div className="progress-header">
                <span className="progress-label">جاري الرفع...</span>
                <span className="progress-percentage">{uploadProgress}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                >
                  <div className="progress-shine"></div>
                </div>
              </div>
              <p className="progress-info">
                <Loader2 className="spinning" size={16} />
                يرجى عدم إغلاق الصفحة حتى اكتمال الرفع
              </p>
            </div>
          )}

          {/* رسائل الخطأ والنجاح */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              <span>{error}</span>
              <button 
                type="button" 
                className="alert-close"
                onClick={() => setError('')}
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          {success && (
            <div className="alert alert-success">
              <CheckCircle2 size={20} />
              <span>{success}</span>
            </div>
          )}

          {/* أزرار التحكم */}
          <div className="button-group">
            {uploading ? (
              <button 
                type="button" 
                className="btn btn-danger btn-large" 
                onClick={cancelUpload}
              >
                <X size={20} />
                إلغاء الرفع
              </button>
            ) : (
              <>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-large" 
                  disabled={!videoFile}
                >
                  <Sparkles size={20} />
                  نشر الفيديو
                  <div className="btn-shine"></div>
                </button>
                
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeft size={18} />
                  رجوع
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
