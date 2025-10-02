import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { FaUpload, FaVideo, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import './UploadPage.css';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const replyTo = searchParams.get('replyTo');

  // التحقق من الصلاحيات
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // التحقق من صلاحية النشر
    if (user.role !== 'creator' && user.role !== 'admin') {
      setError('ليس لديك صلاحية لرفع الفيديوهات. يجب أن تكون منشئ محتوى.');
    }
  }, [user, navigate]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) { // 100MB
        setError('حجم الملف يجب أن يكون أقل من 100 ميجابايت');
        return;
      }
      
      setFile(selectedFile);
      setError('');
      
      // إنشاء معاينة
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('الرجاء اختيار فيديو');
      return;
    }

    // التحقق مرة أخرى من الصلاحيات
    if (user.role !== 'creator' && user.role !== 'admin') {
      setError('ليس لديك صلاحية لرفع الفيديوهات');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('video', file);
    formData.append('description', description);
    if (replyTo) {
      formData.append('replyTo', replyTo);
    }

    try {
      const response = await api.post('/api/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload Progress: ${percentCompleted}%`);
        }
      });

      // نجح الرفع
      navigate('/');
    } catch (error) {
      console.error('Upload error:', error);
      if (error.response?.status === 403) {
        setError('ليس لديك صلاحية لرفع الفيديوهات');
      } else {
        setError(error.response?.data?.message || 'فشل رفع الفيديو');
      }
    } finally {
      setUploading(false);
    }
  };

  // إذا لم يكن لديه صلاحية
  if (user && user.role === 'user') {
    return (
      <div className="upload-page">
        <div className="no-permission-container">
          <FaExclamationTriangle className="warning-icon" />
          <h2>ليس لديك صلاحية للنشر</h2>
          <p>حسابك حالياً بصلاحية "مستخدم عادي"</p>
          <p>لرفع الفيديوهات، تحتاج إلى صلاحية "منشئ محتوى"</p>
          <div className="permission-info">
            <h3>كيف تحصل على صلاحية النشر؟</h3>
            <ul>
              <li>تواصل مع أحد المديرين</li>
              <li>اطلب ترقية حسابك إلى "منشئ محتوى"</li>
              <li>انتظر الموافقة على طلبك</li>
            </ul>
          </div>
          <button className="back-btn" onClick={() => navigate('/')}>
            العودة للرئيسية
          </button>
        </div>
        <NavigationBar currentPage="upload" />
      </div>
    );
  }

  return (
    <div className="upload-page">
      <div className="upload-container">
        <h1>{replyTo ? 'رفع رد على الفيديو' : 'رفع فيديو جديد'}</h1>
        
        {error && (
          <div className="error-message">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}

        <div className="upload-form">
          {!file ? (
            <label className="file-selector">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                hidden
              />
              <FaVideo className="upload-icon" />
              <p>اضغط لاختيار فيديو</p>
              <span>MP4, MOV, AVI (حتى 100MB)</span>
            </label>
          ) : (
            <div className="preview-section">
              <video 
                src={preview} 
                controls 
                className="video-preview"
              />
              <button 
                className="change-video-btn"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
              >
                تغيير الفيديو
              </button>
            </div>
          )}

          <textarea
            placeholder="اكتب وصفاً للفيديو..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="description-input"
            rows={4}
          />

          <div className="upload-actions">
            <button
              className="upload-btn"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? (
                <>
                  <FaSpinner className="spinner" />
                  <span>جاري الرفع...</span>
                </>
              ) : (
                <>
                  <FaUpload />
                  <span>رفع الفيديو</span>
                </>
              )}
            </button>
            
            <button 
              className="cancel-btn"
              onClick={() => navigate('/')}
              disabled={uploading}
            >
              إلغاء
            </button>
          </div>
        </div>

        {/* معلومات الصلاحيات */}
        <div className="role-info">
          <p>صلاحيتك الحالية: <strong>{getRoleLabel(user?.role)}</strong></p>
        </div>
      </div>

      <NavigationBar currentPage="upload" />
    </div>
  );
};

// دالة مساعدة لعرض اسم الصلاحية
const getRoleLabel = (role) => {
  switch (role) {
    case 'admin':
      return 'مدير';
    case 'creator':
      return 'منشئ محتوى';
    default:
      return 'مستخدم عادي';
  }
};

export default UploadPage;
