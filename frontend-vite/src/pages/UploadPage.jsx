import React, { useState, useEffect, useRef } from 'react';
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(null);
  
  const cancelTokenRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // 📊 إعدادات التحقق من الملف
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

  // 🔐 التحقق من تسجيل الدخول
  useEffect(() => {
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
      navigate('/login');
    }
  }, [user, navigate]);

  // 🧹 تنظيف الذاكرة عند إلغاء المكون
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      // إلغاء الطلب إذا كان جارياً
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, [preview]);

  const validateFile = (file) => {
    // التحقق من نوع الملف
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return 'نوع الملف غير مدعوم. يرجى اختيار MP4, MOV, AVI, أو WebM';
    }
    
    // التحقق من حجم الملف
    if (file.size > MAX_FILE_SIZE) {
      return `حجم الملف كبير جداً. الحد الأقصى هو ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }
    
    return null;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;

    // التحقق من صحة الملف
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setVideoFile(null);
      setPreview(null);
      return;
    }

    // تنظيف preview السابق
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setVideoFile(file);
    setError('');
    setPreview(URL.createObjectURL(file));
  };

  const resetUpload = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setVideoFile(null);
    setPreview(null);
    setUploadProgress(0);
    const input = document.getElementById('video-input');
    if (input) input.value = '';
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

    // إنشاء cancel token
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

      setSuccess('✅ تم رفع الفيديو بنجاح!');
      
      // الانتقال للصفحة الرئيسية بعد النجاح
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
      <div className="upload-container">
        <h1 className="upload-title">
          {replyToId ? '🎬 إضافة رد جديد' : '🚀 نشر فيديو جديد'}
        </h1>

        <form onSubmit={handleSubmit}>
          {/* 📹 اختيار الفيديو */}
          <div className="video-upload-area">
            {preview ? (
              <div className="video-preview">
                <video src={preview} controls muted loop />
                <div className="video-info">
                  <p className="file-name">{videoFile?.name}</p>
                  <p className="file-size">{formatFileSize(videoFile?.size || 0)}</p>
                </div>
                <button
                  type="button"
                  className="change-video-btn"
                  onClick={resetUpload}
                  disabled={uploading}
                >
                  🔄 تغيير الفيديو
                </button>
              </div>
            ) : (
              <label htmlFor="video-input" className="upload-label">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="upload-svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M12 4v16m8-8H4" 
                  />
                </svg>
                <p className="upload-main-text">اضغط لاختيار فيديو من جهازك</p>
                <p className="upload-sub-text">
                  MP4, MOV, AVI, WebM (حتى {MAX_FILE_SIZE / (1024 * 1024)}MB)
                </p>
                <input 
                  id="video-input" 
                  type="file" 
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/webm" 
                  onChange={handleFileSelect} 
                  hidden 
                />
              </label>
            )}
          </div>

          {/* ✏️ وصف الفيديو */}
          <div className="form-group">
            <label htmlFor="description">
              الوصف (اختياري) 
              <span className="char-count">{description.length}/500</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setDescription(e.target.value);
                }
              }}
              placeholder="أضف وصفاً جذاباً لفيديوك..."
              rows="4"
              disabled={uploading}
            />
          </div>

          {/* 📊 شريط التقدم */}
          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="progress-text">{uploadProgress}% مكتمل</p>
            </div>
          )}

          {/* ⚠️ رسائل الخطأ والنجاح */}
          {error && (
            <div className="error-message" role="alert">
              ⚠️ {error}
            </div>
          )}
          
          {success && (
            <div className="success-message" role="status">
              {success}
            </div>
          )}

          {/* 🎯 أزرار التحكم */}
          <div className="button-group">
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={uploading || !videoFile}
            >
              {uploading ? (
                <>
                  <div className="loader"></div>
                  <span>جاري الرفع...</span>
                </>
              ) : (
                '🚀 نشر الفيديو'
              )}
            </button>

            {uploading && (
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={cancelUpload}
              >
                ❌ إلغاء
              </button>
            )}

            {!uploading && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => navigate(-1)}
              >
                رجوع
              </button>
            )}
          </div>
        </form>
      </div>

      <NavigationBar currentPage="upload" />
    </div>
  );
};


export default UploadPage;
