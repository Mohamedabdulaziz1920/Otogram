const User = require('../models/User');

const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      
      if (!user) {
        return res.status(404).json({ message: 'المستخدم غير موجود' });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          message: 'ليس لديك الصلاحية للقيام بهذا الإجراء',
          requiredRole: allowedRoles,
          userRole: user.role
        });
      }

      req.userRole = user.role;
      next();
    } catch (error) {
      console.error('Error checking role:', error);
      res.status(500).json({ message: 'خطأ في التحقق من الصلاحيات' });
    }
  };
};

module.exports = checkRole;
