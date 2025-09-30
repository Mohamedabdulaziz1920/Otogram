// ملف: src/components/AdminRoute.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // انتظر حتى يتم التحقق من المستخدم
  if (loading) {
    return <div>جاري التحميل...</div>; // أو عرض loading spinner
  }

  // تحقق مما إذا كان المستخدم موجودًا وهو أدمن
  if (user && user.role === 'admin') {
    return children; // إذا كان أدمن، اعرض الصفحة المطلوبة
  }

  // إذا لم يكن أدمن، قم بإعادة توجيهه إلى الصفحة الرئيسية
  return <Navigate to="/" replace />;
};

export default AdminRoute;
