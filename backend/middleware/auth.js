const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // 1. تحقق من وجود JWT_SECRET في متغيرات البيئة
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('FATAL ERROR: JWT_SECRET is not defined.');
    return res.status(500).json({ error: 'Internal server configuration error.' });
  }

  // 2. استخراج التوكن من الهيدر
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1]; // استخراج التوكن بعد "Bearer "

  // 3. التحقق من التوكن وفك تشفيره
  try {
    const decodedPayload = jwt.verify(token, jwtSecret);
    
    // 4. إرفاق بيانات المستخدم بالطلب (request object)
    // هذا يجعل البيانات متاحة في جميع المسارات المحمية والـ middleware اللاحق
    req.user = {
      id: decodedPayload.userId,
      role: decodedPayload.role
    };

    // ✨ ملاحظة: في الكود القديم، كنت تستخدم req.userId. من الأفضل استخدام req.user.id
    // إذا أردت الحفاظ على التوافق، يمكنك إضافة كليهما:
    req.userId = decodedPayload.userId;


    next(); // اسمح للطلب بالمرور إلى الخطوة التالية
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access denied. Token has expired.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Access denied. Invalid token.' });
    }
    // للأخطاء الأخرى غير المتوقعة
    return res.status(401).json({ error: 'Authentication failed.' });
  }
};

module.exports = auth;
