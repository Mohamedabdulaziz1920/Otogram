// server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// --- Middleware ---
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://otogram.vercel.app' 
}));
app.use(express.json());

// --- MongoDB Connection and Server Initialization ---
// هذا هو الهيكل الصحيح الذي يمنع مشاكل "السباق"
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB connected successfully. Initializing routes...');

  // ✨ تحميل المسارات (Routes) فقط بعد نجاح الاتصال بقاعدة البيانات
  // هذا يضمن أن GridFS (الذي يتم تهيئته في الملفات الأخرى) سيكون جاهزًا.
  const authRoutes = require('./routes/auth');
  const videoRoutes = require('./routes/videos');
  const userRoutes = require('./routes/users');
  // const filesRoutes = require('./routes/files'); // إذا كان لديك هذا الملف

  app.use('/api/auth', authRoutes);
  app.use('/api/videos', videoRoutes);
  app.use('/api/users', userRoutes);
  // app.use('/api/files', filesRoutes);

  // Root endpoint للتأكد من أن السيرفر يعمل
  app.get('/', (req, res) => {
    res.json({ message: 'Otogram API is running successfully!' });
  });

  // ✨ تشغيل السيرفر فقط بعد أن يكون كل شيء جاهزًا
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

})
.catch((err) => {
  console.error('❌ FATAL: MongoDB connection error:', err.message);
  process.exit(1); // إنهاء العملية إذا فشل الاتصال
});
