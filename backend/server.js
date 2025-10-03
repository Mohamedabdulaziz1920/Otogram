const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { GridFSBucket } = require('mongodb');

dotenv.config();
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://otogram.vercel.app'
}));
app.use(express.json());

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully.');

    const db = mongoose.connection.db;

    // GridFS Buckets
    const videoBucket = new GridFSBucket(db, { bucketName: 'videos' });
    const imageBucket = new GridFSBucket(db, { bucketName: 'images' });

    // Middleware لإرفاق الـ Buckets
    app.use((req, res, next) => {
      req.gfs = videoBucket;
      req.imageBucket = imageBucket;
      next();
    });

    // --- Routes ---
    const authRoutes = require('./routes/auth');
    const videoRoutes = require('./routes/videos');
    const userRoutes = require('./routes/users');
    const filesRoutes = require('./routes/files');

    app.use('/api/auth', authRoutes);
    app.use('/api/videos', videoRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/files', filesRoutes);

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({ message: 'Otogram API is running successfully!' });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  })
  .catch((err) => {
    console.error('❌ FATAL: MongoDB connection error:', err);
    process.exit(1);
  });
