// ملف: src/pages/AdminDashboard.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css'; // سنقوم بإنشاء هذا الملف للتنسيق

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // جلب قائمة المستخدمين عند تحميل الصفحة
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setUsers(response.data);
      } catch (err) {
        setError('فشل في جلب المستخدمين. قد لا تكون لديك الصلاحية.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // دالة لتغيير دور المستخدم
  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      await api.patch(`/api/users/role/${userId}`, { role: newRole }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // تحديث الحالة في الواجهة الأمامية فورًا
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user._id === userId ? { ...user, role: newRole } : user
        )
      );
    } catch (err) {
      alert('فشل في تحديث الدور.');
    }
  };

  if (loading) return <div className="loading-container">جاري تحميل لوحة التحكم...</div>;
  if (error) return <div className="error-container">{error}</div>;

  return (
    <div className="admin-dashboard">
      <h1>لوحة تحكم المستخدمين</h1>
      <p>هنا يمكنك إدارة أدوار المستخدمين ومنح صلاحيات "Creator".</p>

      <div className="user-table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>اسم المستخدم</th>
              <th>البريد الإلكتروني</th>
              <th>الدور الحالي</th>
              <th>تغيير الدور إلى</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td><span className={`role-badge role-${user.role}`}>{user.role}</span></td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="creator">Creator</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
