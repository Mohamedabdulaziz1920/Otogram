import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { FaUser, FaUserShield, FaUserTie, FaSearch, FaCheck, FaTimes } from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // التحقق من صلاحيات الأدمن
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // جلب المستخدمين
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users');
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // البحث عن المستخدمين
  useEffect(() => {
    const filtered = users.filter(u => 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  // تحديث صلاحيات المستخدم
  const updateUserRole = async (userId, newRole) => {
    setUpdating(userId);
    try {
      await api.patch(`/api/users/role/${userId}`, { role: newRole });
      
      // تحديث القائمة محلياً
      setUsers(users.map(u => 
        u._id === userId ? { ...u, role: newRole } : u
      ));
      
      showNotification('تم تحديث الصلاحيات بنجاح', 'success');
    } catch (error) {
      console.error('Error updating role:', error);
      showNotification('فشل تحديث الصلاحيات', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const showNotification = (message, type) => {
    // يمكنك استخدام مكتبة toast هنا
    console.log(`${type}: ${message}`);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <FaUserShield className="role-icon admin" />;
      case 'creator':
        return <FaUserTie className="role-icon creator" />;
      default:
        return <FaUser className="role-icon user" />;
    }
  };

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

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>جاري تحميل البيانات...</p>
    </div>
  );

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>لوحة تحكم المدير</h1>
        <div className="stats-summary">
          <div className="stat-card">
            <h3>إجمالي المستخدمين</h3>
            <p>{users.length}</p>
          </div>
          <div className="stat-card">
            <h3>منشئي المحتوى</h3>
            <p>{users.filter(u => u.role === 'creator').length}</p>
          </div>
          <div className="stat-card">
            <h3>المديرين</h3>
            <p>{users.filter(u => u.role === 'admin').length}</p>
          </div>
        </div>
      </div>

      <div className="search-section">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="البحث عن مستخدم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>الصورة</th>
              <th>اسم المستخدم</th>
              <th>البريد الإلكتروني</th>
              <th>الصلاحية الحالية</th>
              <th>تغيير الصلاحية</th>
              <th>تاريخ التسجيل</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u._id}>
                <td>
                  <img 
                    src={u.profileImage || '/default-avatar.png'} 
                    alt={u.username}
                    className="user-avatar"
                  />
                </td>
                <td>@{u.username}</td>
                <td>{u.email}</td>
                <td>
                  <div className="role-badge">
                    {getRoleIcon(u.role)}
                    <span>{getRoleLabel(u.role)}</span>
                  </div>
                </td>
                <td>
                  <div className="role-selector">
                    <button
                      className={`role-btn ${u.role === 'user' ? 'active' : ''}`}
                      onClick={() => updateUserRole(u._id, 'user')}
                      disabled={updating === u._id || u._id === user._id}
                    >
                      <FaUser /> عادي
                    </button>
                    <button
                      className={`role-btn ${u.role === 'creator' ? 'active' : ''}`}
                      onClick={() => updateUserRole(u._id, 'creator')}
                      disabled={updating === u._id || u._id === user._id}
                    >
                      <FaUserTie /> منشئ
                    </button>
                    <button
                      className={`role-btn ${u.role === 'admin' ? 'active' : ''}`}
                      onClick={() => updateUserRole(u._id, 'admin')}
                      disabled={updating === u._id || u._id === user._id}
                    >
                      <FaUserShield /> مدير
                    </button>
                  </div>
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString('ar-SA')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NavigationBar currentPage="admin" />
    </div>
  );
};

export default AdminDashboard;
