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
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully. Initializing routes...');

    // تحميل المسارات (Routes) فقط بعد نجاح الاتصال
    const authRoutes = require('./routes/auth');
    const videoRoutes = require('./routes/videos');
    const userRoutes = require('./routes/users');

    app.use('/api/auth', authRoutes);
    app.use('/api/videos', videoRoutes);
    app.use('/api/users', userRoutes);

    // ✅ Root endpoint للتأكد أن السيرفر شغال
    app.get('/', (req, res) => {
      res.json({ message: 'otogram API is running successfully!' });
    });

    // ✅ تشغيل السيرفر بعد أن يكون كل شيء جاهز
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('FATAL: MongoDB connection error:', err.message);
    process.exit(1); // إنهاء العملية إذا فشل الاتصال
  });
