// ملف: src/components/PrivateRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>جاري التحميل...</div>; // أو loading spinner
  }

  // إذا كان المستخدم مصادقًا عليه، اعرض المحتوى. وإلا، أعد توجيهه لصفحة الدخول.
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
