const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// إعداد multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('يُسمح فقط بملفات الفيديو'));
    }
  }
});

// رفع فيديو - متاح فقط للـ creators والـ admins
router.post('/upload', 
  auth, 
  checkRole(['creator', 'admin']), 
  upload.single('video'), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'لم يتم رفع فيديو' });
      }

      const video = new Video({
        user: req.userId,
        videoUrl: `/uploads/${req.file.filename}`,
        description: req.body.description || '',
        replyTo: req.body.replyTo || null
      });

      await video.save();
      await video.populate('user', 'username profileImage role');

      res.status(201).json({
        message: 'تم رفع الفيديو بنجاح',
        video
      });
    } catch (error) {
      console.error('Upload error:', error);
      // حذف الملف في حالة الخطأ
      if (req.file) {
        fs.unlinkSync(path.join(__dirname, '../uploads', req.file.filename));
      }
      res.status(500).json({ message: 'خطأ في رفع الفيديو' });
    }
  }
);

// الحصول على جميع الفيديوهات - متاح للجميع
router.get('/', async (req, res) => {
  try {
    const videos = await Video.find({ replyTo: null })
      .populate('user', 'username profileImage role')
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
          select: 'username profileImage role'
        }
      })
      .sort('-createdAt');

    res.json(videos);
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ message: 'خطأ في جلب الفيديوهات' });
  }
});

// حذف فيديو - المالك أو الأدمن فقط
router.delete('/:id', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ message: 'الفيديو غير موجود' });
    }

    // التحقق من الصلاحيات
    const user = await User.findById(req.userId);
    const isOwner = video.user.toString() === req.userId;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'ليس لديك الصلاحية لحذف هذا الفيديو' });
    }

    // حذف الملف
    const filePath = path.join(__dirname, '..', video.videoUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // حذف الردود المرتبطة
    const replies = await Video.find({ replyTo: video._id });
    for (const reply of replies) {
      const replyPath = path.join(__dirname, '..', reply.videoUrl);
      if (fs.existsSync(replyPath)) {
        fs.unlinkSync(replyPath);
      }
      await reply.deleteOne();
    }

    await video.deleteOne();
    
    res.json({ message: 'تم حذف الفيديو بنجاح' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'خطأ في حذف الفيديو' });
  }
});

// إعجاب/إلغاء إعجاب - متاح لجميع المستخدمين المسجلين
router.post('/:id/like', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ message: 'الفيديو غير موجود' });
    }

    const userIndex = video.likes.indexOf(req.userId);
    
    if (userIndex > -1) {
      video.likes.splice(userIndex, 1);
    } else {
      video.likes.push(req.userId);
    }

    await video.save();
    
    res.json({ 
      liked: userIndex === -1,
      likes: video.likes.length 
    });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ message: 'خطأ في معالجة الإعجاب' });
  }
});

module.exports = router;
