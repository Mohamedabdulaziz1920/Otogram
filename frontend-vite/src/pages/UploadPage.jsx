import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { FaUpload, FaVideo, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import './UploadPage.css';

const UploadPage = () => {
  const [file, setFile] = useState(null);
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
    if (user.role !== 'creator' && user.role !== 'admin') {
      setError('ليس لديك صلاحية لرفع الفيديوهات.');
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
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('الرجاء اختيار فيديو');
      return;
    }
    if (user.role !== 'creator' && user.role !== 'admin') {
      setError('ليس لديك صلاحية لرفع الفيديوهات');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('video', file);
    // ✨ تم حذف إرسال الوصف من هنا

    try {
      // تحديد المسار الصحيح بناءً على ما إذا كان ردًا أم لا
      const url = replyTo ? `/api/videos/reply/${replyTo}` : '/api/videos/upload';
      
      await api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigate('/');
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.error || 'فشل رفع الفيديو');
    } finally {
      setUploading(false);
    }
  };

  // عرض رسالة إذا لم يكن لديه صلاحية
  if (user && user.role === 'user') {
    return (
      <div className="upload-page">
        <div className="no-permission-container">
          <FaExclamationTriangle className="warning-icon" />
          <h2>ليس لديك صلاحية للنشر</h2>
          <p>لرفع الفيديوهات، تحتاج إلى صلاحية "منشئ محتوى" من الإدارة.</p>
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
        <h1>{replyTo ? 'رفع رد' : 'رفع فيديو جديد'}</h1>
        
        {error && <div className="error-message">{error}</div>}

        <div className="upload-form">
          {!file ? (
            <label className="file-selector">
              <input type="file" accept="video/*" onChange={handleFileSelect} hidden />
              <FaVideo className="upload-icon" />
              <p>اضغط لاختيار فيديو</p>
              <span>(الحد الأقصى 100MB)</span>
            </label>
          ) : (
            <div className="preview-section">
              <video src={preview} controls className="video-preview" />
              <button className="change-video-btn" onClick={() => { setFile(null); setPreview(null); }}>
                تغيير الفيديو
              </button>
            </div>
          )}

          {/* ✨ تم حذف حقل إدخال الوصف من هنا */}

          <div className="upload-actions">
            <button className="upload-btn" onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? (
                <><FaSpinner className="spinner" /><span>جاري الرفع...</span></>
              ) : (
                <><FaUpload /><span>رفع الفيديو</span></>
              )}
            </button>
            <button className="cancel-btn" onClick={() => navigate('/')} disabled={uploading}>
              إلغاء
            </button>
          </div>
        </div>
      </div>
      <NavigationBar currentPage="upload" />
    </div>
  );
};

export default UploadPage;
