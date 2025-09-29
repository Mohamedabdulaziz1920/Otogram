const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// --- Middleware ---
// ✨ 1. تقييد CORS للسماح للواجهة الأمامية فقط بالوصول
//    (من الأفضل وضع هذا الرابط في متغيرات البيئة في Render)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://tiktok-frontend-of56.onrender.com' 
}));
app.use(express.json());

// ✨ 2. تم حذف express.static بالكامل لأنه غير مناسب لـ Render
//    نحن نعتمد على GridFS لتخزين وبث الفيديوهات من قاعدة البيانات.

// --- MongoDB Connection and Server Initialization ---
// ✨ 3. تم تعديل هيكل الاتصال لحل مشكلة "السباق"
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('MongoDB connected successfully. Initializing routes...');

  // ✨ 4. تحميل المسارات (Routes) فقط بعد نجاح الاتصال بقاعدة البيانات
  //    هذا يضمن أن GridFS وكل شيء آخر يعتمد على قاعدة البيانات سيكون جاهزًا.
  const authRoutes = require('./routes/auth');
  const videoRoutes = require('./routes/videos');
  const userRoutes = require('./routes/users');
  const filesRoutes = require('./routes/files');

  app.use('/api/auth', authRoutes);
  app.use('/api/videos', videoRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/files', filesRoutes);

  // Root endpoint للتأكد من أن السيرفر يعمل
  app.get('/', (req, res) => {
    res.json({ message: 'TikTok Clone API is running successfully!' });
  });

  // ✨ 5. تشغيل السيرفر فقط بعد أن يكون كل شيء جاهزًا
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

})
.catch((err) => {
  console.error('FATAL: MongoDB connection error:', err.message);
  // إنهاء العملية إذا فشل الاتصال، لأن التطبيق لا يمكنه العمل بدون قاعدة بيانات
  process.exit(1);
});
