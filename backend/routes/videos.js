const express = require('express');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const Video = require('../models/Video');
const User = require('../models/User');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

// --- إعداد GridFS Storage للفيديوهات ---
// هذه الطريقة هي الأكثر استقرارًا وموثوقية وتتوافق مع Render
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return {
      bucketName: 'videos',
      filename: `${Date.now()}-vid-${file.originalname.replace(/\s/g, '_')}`
    };
  }
});

// إعداد Multer مع فلتر للتحقق من نوع الملف
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/avi", "video/mov"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الفيديو غير مدعوم.'), false);
    }
  }
});

// --- المسارات ---

// 1. رفع فيديو أساسي
router.post('/upload', auth, checkRole(['creator', 'admin']), upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم رفع أي ملف فيديو.' });
    }
    
    const { description } = req.body;

    const video = new Video({
      user: req.user._id,
      fileId: req.file.id,
      videoUrl: `/api/videos/stream/${req.file.id}`,
      description: description || '',
      isReply: false,
    });

    await video.save();

    const videoResponse = video.toObject();
    videoResponse.user = {
      _id: req.user._id,
      username: req.user.username,
      profileImage: req.user.profileImage
    };
    
    res.status(201).json({ message: 'تم رفع الفيديو بنجاح', video: videoResponse });

  } catch (error) {
    console.error('!!! UPLOAD ROUTE CRITICAL ERROR:', error);
    if (req.file && req.file.id) {
      try {
        const bucket = req.gfs; // استخدام req.gfs الذي تم إعداده في server.js
        await bucket.delete(new mongoose.Types.ObjectId(req.file.id));
        console.log(`Orphaned file ${req.file.id} was deleted successfully.`);
      } catch (deleteError) {
        console.error('Failed to delete orphaned GridFS file:', deleteError);
      }
    }
    res.status(500).json({ error: 'حدث خطأ غير متوقع أثناء معالجة طلبك.' });
  }
});

// 2. جلب جميع الفيديوهات الرئيسية
router.get('/', async (req, res) => {
  try {
    const videos = await Video.find({ isReply: false })
      .populate('user', 'username profileImage')
      .populate({
        path: 'replies',
        populate: { path: 'user', select: 'username profileImage' }
      })
      .sort({ createdAt: -1 });
    
    const validVideos = videos.filter(video => video.user);
    res.json(validVideos);

  } catch (error) {
    console.error('Fetch videos error:', error);
    res.status(500).json({ error: 'فشل في جلب الفيديوهات.' });
  }
});

// 3. بث الفيديو (ضروري لمشاهدة الفيديوهات)
router.get('/stream/:fileId', async (req, res) => {
  try {
    const bucket = req.gfs;
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'لم يتم العثور على الفيديو.' });
    }
    const file = files[0];

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
    console.error('Video stream error:', error);
    res.status(500).json({ error: 'فشل في بث الفيديو.' });
  }
});

// 4. حذف فيديو
router.delete('/:videoId', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'لم يتم العثور على الفيديو.' });

    if (video.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'غير مصرح لك بتنفيذ هذا الإجراء.' });
    }

    const bucket = req.gfs;

    if (!video.isReply) {
      const replies = await Video.find({ parentVideo: video._id });
      for (const reply of replies) {
        if (reply.fileId) await bucket.delete(new mongoose.Types.ObjectId(reply.fileId));
        await reply.deleteOne();
      }
    }

    if (video.fileId) await bucket.delete(new mongoose.Types.ObjectId(video.fileId));
    
    await video.deleteOne();
    res.json({ message: 'تم حذف الفيديو بنجاح.' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'فشل في حذف الفيديو.' });
  }
});

// 5. إعجاب/إلغاء إعجاب
router.post('/:id/like', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'الفيديو غير موجود.' });
    }

    const userIdString = req.user._id.toString();
    const userIndex = video.likes.map(id => id.toString()).indexOf(userIdString);
    
    if (userIndex > -1) {
      video.likes.splice(userIndex, 1); // إلغاء الإعجاب
    } else {
      video.likes.push(req.user._id); // إضافة إعجاب
    }

    await video.save();
    
    res.json({ 
      liked: userIndex === -1,
      likesCount: video.likes.length 
    });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ message: 'خطأ في معالجة الإعجاب.' });
  }
});


module.exports = router;
