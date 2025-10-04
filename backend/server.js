const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { GridFSBucket } = require('mongodb');

// ✨✨✨ البصمة للتحقق من نسخة الكود ✨✨✨
console.log(`--- SERVER CODE VERSION: ${new Date().toISOString()} --- THIS IS THE LATEST VERSION ---`);

dotenv.config();
const app = express();

// CORS Configuration - محسّنة
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://otogram.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ].filter(Boolean);
    
    // السماح للطلبات بدون origin (مثل Postman أو الخادم نفسه)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // مهم جداً للـ cookies والـ authentication
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (للصور والفيديوهات المحلية إن وجدت)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
})
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

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        message: 'Server is healthy',
        timestamp: new Date().toISOString()
      });
    });

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({ 
        message: 'Otogram API is running successfully!',
        version: '1.0.0',
        endpoints: {
          auth: '/api/auth',
          videos: '/api/videos',
          users: '/api/users',
          files: '/api/files',
          health: '/health'
        }
      });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Error:', err.stack);
      
      if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS policy violation' });
      }
      
      res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
          ? 'Something went wrong!' 
          : err.message
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
    });

  })
  .catch((err) => {
    console.error('❌ FATAL: MongoDB connection error:', err.message);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err);
  process.exit(1);
});
