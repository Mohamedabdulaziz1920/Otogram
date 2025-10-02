import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import UploadPage from './pages/UploadPage';
import PrivateRoute from './components/PrivateRoute';
import AdminDashboard from './pages/AdminDashboard';
import AdminRoute from './components/AdminRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/upload" element={
              <PrivateRoute>
                <UploadPage />
              </PrivateRoute>
            } />
             {/* هذا هو النمط الصحيح لـ React Router v6 */}
  <Route element={<AdminRoute />}>
    <Route path="/admin" element={<AdminDashboard />} />
    {/* يمكنك إضافة مسارات أخرى محمية للأدمن هنا في المستقبل */}
    {/* <Route path="/admin/settings" element={<AdminSettingsPage />} /> */}
  </Route>
</Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
