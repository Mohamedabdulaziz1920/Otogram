const express = require('express');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const Video = require('../models/Video');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin'); // نفترض أن لديك middleware للتحقق من الأدمن
const checkRole = require('../middleware/checkRole'); // نفترض أن لديك middleware للتحقق من الأدوار
const { getGridFSBucket } = require('../config/gridfs');
const router = express.Router();

// --- إعداد GridFS Storage للفيديوهات ---
const storage = new GridFsStorage({
  db: mongoose.connection,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      const filename = 'video-' + Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileInfo = {
        filename: filename,
        bucketName: 'videos',
      };
      resolve(fileInfo);
    });
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('يُسمح فقط بملفات الفيديو'), false);
    }
  }
});

// --- المسارات ---

// رفع فيديو (أساسي أو رد)
router.post('/upload', auth, checkRole(['creator', 'admin']), upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
    }
    
    // ✨ تم حذف الاعتماد على req.body.description
    const video = new Video({
      user: req.userId,
      fileId: req.file.id,
      videoUrl: `/api/videos/stream/${req.file.id}`,
      isReply: false,
    });

    await video.save();
    res.status(201).json({ message: 'تم رفع الفيديو بنجاح', video });
  } catch (error) {
    console.error('Upload error:', error);
    // حذف الملف من GridFS في حالة الخطأ
    if (req.file) {
      try {
        const bucket = getGridFSBucket();
        await bucket.delete(req.file.id);
      } catch (deleteError) {
        console.error('Failed to delete orphaned file from GridFS:', deleteError);
      }
    }
    res.status(500).json({ error: 'حدث خطأ أثناء رفع الفيديو' });
  }
});

router.post('/reply/:videoId', auth, checkRole(['creator', 'admin', 'user']), upload.single('video'), async (req, res) => {
    // ... نفس منطق رفع الرد ولكن باستخدام GridFS وبدون description
});

// جلب جميع الفيديوهات الرئيسية
router.get('/', async (req, res) => {
  try {
    const videos = await Video.find({ isReply: false })
      .populate('user', 'username profileImage')
      .populate({
        path: 'replies',
        populate: { path: 'user', select: 'username profileImage' }
      })
      .sort({ createdAt: -1 });
    
    // فلتر لإزالة الفيديوهات التي لا تملك مستخدمًا
    const validVideos = videos.filter(video => video.user);
    res.json(validVideos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// بث الفيديو (مهم جدًا)
router.get('/stream/:fileId', async (req, res) => {
  try {
    const bucket = getGridFSBucket();
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }
    const file = files[0];

    // دعم التشغيل الجزئي (Streaming)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
      const chunksize = (end - start) + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${file.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': file.contentType || 'video/mp4',
      });
      bucket.openDownloadStream(fileId, { start, end: end + 1 }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': file.length,
        'Content-Type': file.contentType || 'video/mp4',
      });
      bucket.openDownloadStream(fileId).pipe(res);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to stream video' });
  }
});


// حذف فيديو (أساسي أو رد)
router.delete('/:videoId', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });

    // التحقق من الصلاحيات (المالك أو الأدمن)
    const currentUser = await User.findById(req.userId);
    if (video.user.toString() !== req.userId && currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const bucket = getGridFSBucket();

    // إذا كان الفيديو رئيسيًا، قم بحذف جميع ردوده أولاً
    if (!video.isReply) {
      const replies = await Video.find({ parentVideo: video._id });
      for (const reply of replies) {
        if (reply.fileId) await bucket.delete(reply.fileId);
        await reply.deleteOne();
      }
    }

    // حذف ملف الفيديو نفسه من GridFS
    if (video.fileId) await bucket.delete(video.fileId);
    
    await video.deleteOne();
    res.json({ message: 'تم حذف الفيديو بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete video' });
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
