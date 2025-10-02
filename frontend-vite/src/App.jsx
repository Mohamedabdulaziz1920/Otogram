import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// استيراد المكونات والصفحات
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import UploadPage from './pages/UploadPage';
import AdminDashboard from './pages/AdminDashboard';
import PrivateRoute from './components/PrivateRoute'; // مكون لحماية مسارات المستخدم المسجل
import AdminRoute from './components/AdminRoute';   // مكون لحماية مسارات الأدمن
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* ليس هناك حاجة لـ div.App هنا إلا إذا كان لديك تنسيقات خاصة به */}
        <Routes>
          {/* --- المسارات العامة (متاحة للجميع) --- */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          
          {/* --- المسارات المحمية (للمستخدمين المسجلين فقط) --- */}
          <Route element={<PrivateRoute />}>
            <Route path="/upload" element={<UploadPage />} />
            {/* يمكنك إضافة مسارات أخرى هنا مثل /settings */}
          </Route>

          {/* --- المسارات المحمية (للأدمن فقط) --- */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            {/* يمكنك إضافة مسارات أخرى هنا مثل /admin/users */}
          </Route>

          {/* (اختياري) مسار احتياطي لصفحات 404 */}
          <Route path="*" element={<div>404 - Page Not Found</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
