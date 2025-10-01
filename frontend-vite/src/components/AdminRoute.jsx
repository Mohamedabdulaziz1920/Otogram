// ملف: src/components/AdminRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom'; // ✨ 1. استيراد Outlet
import { useAuth } from '../context/AuthContext';

const AdminRoute = () => { // ✨ 2. لم نعد بحاجة إلى props 'children'
  const { user, loading } = useAuth();

  // انتظر حتى يتم التحقق من المستخدم لتجنب إعادة التوجيه الخاطئة
  if (loading) {
    // يمكنك عرض مكون تحميل مخصص هنا
    return <div>جاري التحقق من الصلاحيات...</div>;
  }

  // إذا كان المستخدم مسجلاً وهو أدمن، اعرض المسار الفرعي (الابن)
  // Outlet هو المكان الذي سيتم فيه عرض <AdminDashboard />
  if (user && user.role === 'admin') {
    return <Outlet />; // ✨ 3. استخدام Outlet
  }

  // إذا لم يكن أدمن، قم بإعادة توجيهه إلى الصفحة الرئيسية
  return <Navigate to="/" replace />;
};

export default AdminRoute;