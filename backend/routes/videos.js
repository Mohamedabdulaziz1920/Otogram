const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const auth = require('../middleware/auth');

// إنشاء مجلد uploads إذا لم يكن موجوداً
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// إعداد multer للتخزين المحلي
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// رفع فيديو
router.post('/upload', auth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }

    const video = new Video({
      user: req.userId,
      videoUrl: `/uploads/${req.file.filename}`,
      description: req.body.description || '',
      replyTo: req.body.replyTo || null
    });

    await video.save();
    await video.populate('user', 'username profileImage');

    res.status(201).json(video);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading video', error: error.message });
  }
});

// الحصول على جميع الفيديوهات
router.get('/', async (req, res) => {
  try {
    const videos = await Video.find({ replyTo: null })
      .populate('user', 'username profileImage')
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
          select: 'username profileImage'
        }
      })
      .sort('-createdAt');

    res.json(videos);
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ message: 'Error fetching videos', error: error.message });
  }
});

// إعجاب/إلغاء إعجاب
router.post('/:id/like', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
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
    res.status(500).json({ message: 'Error processing like', error: error.message });
  }
});

// حذف فيديو
router.delete('/:id', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this video' });
    }

    // حذف الملف من التخزين المحلي
    const filePath = path.join(uploadsDir, path.basename(video.videoUrl));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // حذف جميع الردود
    await Video.deleteMany({ replyTo: video._id });

    await video.deleteOne();
    
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Error deleting video', error: error.message });
  }
});

module.exports = router;
