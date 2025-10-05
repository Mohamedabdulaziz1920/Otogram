import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  FaUser, FaShieldAlt, FaUserTie, FaSearch, FaCheck, FaTimes,
  FaUsers, FaChartLine, FaFilter, FaEye, FaEdit, FaTrash,
  FaCrown, FaUsersCog, FaChartBar, FaSortAmountDown,
  FaSortAmountUp, FaExclamationTriangle, FaCheckCircle,
  FaMoon, FaSun, FaSync
} from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [notification, setNotification] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [error, setError] = useState(null);
  
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // التحقق من صلاحيات الأدمن
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'admin') {
      showNotification('ليس لديك صلاحية الوصول لهذه الصفحة', 'error');
      setTimeout(() => navigate('/'), 1500);
    }
  }, [user, navigate]);

  // جلب المستخدمين - بدون AbortController
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

const fetchUsers = async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('Fetching users from API...');
    
    // استخدام الطريقة البسيطة التي كانت تعمل
    const response = await api.get('/api/users');
    
    console.log('Users fetched successfully:', response.data);
    
    // ✅ التحقق من البنية الجديدة للبيانات
    if (response.data && response.data.users && Array.isArray(response.data.users)) {
      // البيانات تأتي في شكل { users: [...], pagination: {...} }
      setUsers(response.data.users);
      setFilteredUsers(response.data.users);
      showNotification(`تم تحميل ${response.data.users.length} مستخدم بنجاح`, 'success');
    } else if (response.data && Array.isArray(response.data)) {
      // البيانات تأتي مباشرة كـ Array (الطريقة القديمة)
      setUsers(response.data);
      setFilteredUsers(response.data);
      showNotification(`تم تحميل ${response.data.length} مستخدم بنجاح`, 'success');
    } else {
      throw new Error('البيانات المستلمة غير صحيحة');
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    
    let errorMessage = 'فشل في جلب المستخدمين';
    
    if (error.response) {
      // الخادم رد بخطأ
      errorMessage = error.response.data?.message || `خطأ ${error.response.status}: ${error.response.statusText}`;
      console.error('Server error:', error.response.data);
    } else if (error.request) {
      // لم يتم استلام رد من الخادم
      errorMessage = 'لا يمكن الاتصال بالخادم. تأكد من تشغيل الخادم.';
      console.error('No response received:', error.request);
    } else {
      // خطأ في إعداد الطلب
      errorMessage = error.message || 'حدث خطأ غير متوقع';
      console.error('Request error:', error.message);
    }
    
    setError(errorMessage);
    showNotification(errorMessage, 'error');
    setUsers([]);
    setFilteredUsers([]);
  } finally {
    setLoading(false);
  }
};

  // البحث والفلترة
  useEffect(() => {
    try {
      let filtered = [...users];

      // Filter by search term
      if (searchTerm) {
        filtered = filtered.filter(u => 
          u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Filter by role
      if (filterRole !== 'all') {
        filtered = filtered.filter(u => u.role === filterRole);
      }

      // Sort
      filtered.sort((a, b) => {
        let compareValue = 0;
        switch (sortBy) {
          case 'name':
            compareValue = (a.username || '').localeCompare(b.username || '');
            break;
          case 'role':
            compareValue = (a.role || '').localeCompare(b.role || '');
            break;
          case 'date':
          default:
            compareValue = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            break;
        }
        return sortOrder === 'asc' ? compareValue : -compareValue;
      });

      setFilteredUsers(filtered);
    } catch (err) {
      console.error('Error filtering users:', err);
    }
  }, [searchTerm, users, filterRole, sortBy, sortOrder]);

  // تحديث صلاحيات المستخدم
  const updateUserRole = async (userId, newRole) => {
    if (updating) return; // منع الطلبات المتعددة
    
    setUpdating(userId);
    try {
      console.log(`Updating user ${userId} to role: ${newRole}`);
      await api.patch(`/api/users/role/${userId}`, { role: newRole });
      
      setUsers(users.map(u => 
        u._id === userId ? { ...u, role: newRole } : u
      ));
      
      showNotification('تم تحديث الصلاحيات بنجاح', 'success');
    } catch (error) {
      console.error('Error updating role:', error);
      showNotification(
        error.response?.data?.message || 'فشل تحديث الصلاحيات',
        'error'
      );
    } finally {
      setUpdating(null);
    }
  };

  // حذف مستخدم
  const deleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      console.log(`Deleting user: ${userToDelete._id}`);
      await api.delete(`/api/users/${userToDelete._id}`);
      setUsers(users.filter(u => u._id !== userToDelete._id));
      showNotification('تم حذف المستخدم بنجاح', 'success');
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification(
        error.response?.data?.message || 'فشل حذف المستخدم',
        'error'
      );
    }
  };

  const confirmDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u._id));
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <FaCrown className="role-icon admin" />;
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

  const getAssetUrl = (url) => {
    if (!url || url === '/default-avatar.png') return '/default-avatar.png';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
  };

  // احصائيات المستخدمين
  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    creators: users.filter(u => u.role === 'creator').length,
    users: users.filter(u => u.role === 'user').length,
    newThisWeek: users.filter(u => {
      const createdDate = new Date(u.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdDate > weekAgo;
    }).length
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-wrapper">
          <div className="loading-spinner"></div>
          <p>جاري تحميل لوحة التحكم...</p>
          <p className="loading-hint">الرجاء الانتظار...</p>
        </div>
      </div>
    );
  }

  // Error state with retry
  if (error && users.length === 0) {
    return (
      <div className="error-container">
        <div className="error-wrapper">
          <FaExclamationTriangle className="error-icon" />
          <h2>خطأ في تحميل البيانات</h2>
          <p>{error}</p>
          <div className="error-details">
            <p>تأكد من:</p>
            <ul>
              <li>تشغيل الخادم (Backend)</li>
              <li>صحة عنوان API في ملف .env</li>
              <li>اتصالك بالإنترنت</li>
            </ul>
          </div>
          <div className="error-actions">
            <button onClick={fetchUsers} className="retry-btn">
              <FaSync /> إعادة المحاولة
            </button>
            <button onClick={() => navigate('/')} className="back-btn">
              العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Theme Toggle */}
      <button className="theme-toggle-admin" onClick={toggleTheme} title="تبديل الثيم">
        {theme === 'dark' ? <FaSun /> : <FaMoon />}
      </button>

      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1>
              <FaUsersCog className="header-icon" />
              لوحة تحكم المدير
            </h1>
            <p className="header-subtitle">إدارة المستخدمين والصلاحيات</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">
              <FaUsers />
            </div>
            <div className="stat-content">
              <h3>إجمالي المستخدمين</h3>
              <p className="stat-value">{stats.total}</p>
              <span className="stat-change">
                +{stats.newThisWeek} هذا الأسبوع
              </span>
            </div>
          </div>

          <div className="stat-card admins">
            <div className="stat-icon">
              <FaCrown />
            </div>
            <div className="stat-content">
              <h3>المديرين</h3>
              <p className="stat-value">{stats.admins}</p>
              <div className="stat-progress">
                <div 
                  className="progress-bar"
                  style={{ width: `${stats.total > 0 ? (stats.admins / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="stat-card creators">
            <div className="stat-icon">
              <FaUserTie />
            </div>
            <div className="stat-content">
              <h3>منشئي المحتوى</h3>
              <p className="stat-value">{stats.creators}</p>
              <div className="stat-progress">
                <div 
                  className="progress-bar"
                  style={{ width: `${stats.total > 0 ? (stats.creators / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="stat-card users">
            <div className="stat-icon">
              <FaUser />
            </div>
            <div className="stat-content">
              <h3>المستخدمين العاديين</h3>
              <p className="stat-value">{stats.users}</p>
              <div className="stat-progress">
                <div 
                  className="progress-bar"
                  style={{ width: `${stats.total > 0 ? (stats.users / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="controls-section">
          <div className="search-filter-wrapper">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="البحث عن مستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-controls">
              <div className="filter-dropdown">
                <FaFilter />
                <select 
                  value={filterRole} 
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">جميع الصلاحيات</option>
                  <option value="admin">المديرين فقط</option>
                  <option value="creator">منشئي المحتوى</option>
                  <option value="user">المستخدمين العاديين</option>
                </select>
              </div>

              <div className="sort-controls">
                <button 
                  className={`sort-btn ${sortOrder === 'asc' ? 'active' : ''}`}
                  onClick={() => setSortOrder('asc')}
                  title="ترتيب تصاعدي"
                >
                  <FaSortAmountUp />
                </button>
                <button 
                  className={`sort-btn ${sortOrder === 'desc' ? 'active' : ''}`}
                  onClick={() => setSortOrder('desc')}
                  title="ترتيب تنازلي"
                >
                  <FaSortAmountDown />
                </button>
              </div>

              <button 
                className="refresh-btn"
                onClick={fetchUsers}
                title="تحديث البيانات"
                disabled={loading}
              >
                <FaSync className={loading ? 'spinning' : ''} />
              </button>
            </div>
          </div>

          {selectedUsers.length > 0 && (
            <div className="bulk-actions">
              <span>{selectedUsers.length} مستخدم محدد</span>
              <button className="bulk-btn">تغيير الصلاحيات</button>
              <button className="bulk-btn danger">حذف المحدد</button>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="users-table-container">
          <div className="table-header">
            <h2>قائمة المستخدمين ({filteredUsers.length})</h2>
          </div>

          <div className="table-wrapper">
            {filteredUsers.length > 0 ? (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>
                      <input 
                        type="checkbox"
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={handleSelectAll}
                        className="checkbox"
                      />
                    </th>
                    <th>المستخدم</th>
                    <th>البريد الإلكتروني</th>
                    <th>الصلاحية</th>
                    <th>تاريخ التسجيل</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className={selectedUsers.includes(u._id) ? 'selected' : ''}>
                      <td>
                        <input 
                          type="checkbox"
                          checked={selectedUsers.includes(u._id)}
                          onChange={() => handleSelectUser(u._id)}
                          className="checkbox"
                        />
                      </td>
                      <td>
                        <div className="user-info">
                          <img 
                            src={getAssetUrl(u.profileImage)} 
                            alt={u.username}
                            className="user-avatar"
                            onError={(e) => e.target.src = '/default-avatar.png'}
                          />
                          <div className="user-details">
                            <span className="username">@{u.username}</span>
                            <span className="user-id">ID: {u._id?.slice(-6)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="email-cell">{u.email}</td>
                      <td>
                        <div className={`role-badge ${u.role}`}>
                          {getRoleIcon(u.role)}
                          <span>{getRoleLabel(u.role)}</span>
                        </div>
                      </td>
                      <td className="date-cell">
                        <span className="date">
                          {new Date(u.createdAt).toLocaleDateString('ar-SA')}
                        </span>
                        <span className="time">
                          {new Date(u.createdAt).toLocaleTimeString('ar-SA', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <div className="role-selector">
                            <button
                              className={`role-btn ${u.role === 'user' ? 'active' : ''}`}
                              onClick={() => updateUserRole(u._id, 'user')}
                              disabled={updating === u._id || u._id === user._id}
                              title="مستخدم عادي"
                            >
                              <FaUser />
                            </button>
                            <button
                              className={`role-btn ${u.role === 'creator' ? 'active' : ''}`}
                              onClick={() => updateUserRole(u._id, 'creator')}
                              disabled={updating === u._id || u._id === user._id}
                              title="منشئ محتوى"
                            >
                              <FaUserTie />
                            </button>
                            <button
                              className={`role-btn ${u.role === 'admin' ? 'active' : ''}`}
                              onClick={() => updateUserRole(u._id, 'admin')}
                              disabled={updating === u._id || u._id === user._id}
                              title="مدير"
                            >
                              <FaCrown />
                            </button>
                          </div>
                          
                          <div className="action-buttons">
                            <button 
                              className="action-btn view"
                              onClick={() => navigate(`/profile/${u.username}`)}
                              title="عرض الملف الشخصي"
                            >
                              <FaEye />
                            </button>
                            <button 
                              className="action-btn delete"
                              onClick={() => confirmDelete(u)}
                              disabled={u._id === user._id}
                              title="حذف المستخدم"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <FaExclamationTriangle />
                <p>لا يوجد مستخدمين للعرض</p>
                {searchTerm && <p className="empty-hint">جرب تغيير مصطلح البحث</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تأكيد الحذف</h3>
            </div>
            <div className="modal-body">
              <p>هل أنت متأكد من حذف المستخدم <strong>@{userToDelete?.username}</strong>؟</p>
              <p className="warning">هذا الإجراء لا يمكن التراجع عنه!</p>
            </div>
            <div className="modal-actions">
              <button className="confirm-delete-btn" onClick={deleteUser}>
                <FaTrash /> حذف نهائياً
              </button>
              <button className="cancel-modal-btn" onClick={() => setShowDeleteModal(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`notification-toast ${notification.type}`}>
          {notification.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
          <span>{notification.message}</span>
        </div>
      )}

      <NavigationBar currentPage="admin" />
    </div>
  );
};

export default AdminDashboard;
