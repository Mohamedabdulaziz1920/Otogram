const express = require('express');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const Video = require('../models/Video');
const User = require('../models/User');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// --- تم حذف هذا السطر لأنه سبب المشكلة ---
// const { getGridFSBucket } = require('../config/gridfs'); 

const router = express.Router();

// --- إعداد GridFS Storage للفيديوهات ---
// ✨ التعديل 1: استخدام 'url' بدلاً من 'db' لضمان الاستقرار
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

// ✨ التعديل 2: إضافة fileFilter لفحص نوع الملف قبل أن يبدأ Multer بالرفع
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

// رفع فيديو أساسي (الكود الداخلي كان صحيحًا، فقط معالجة الخطأ تحتاج للتعديل)
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
    console.error('Upload error:', error);
    if (req.file && req.file.id) {
      try {
        // ✨ التعديل 3: استخدام req.gfs الذي أعددناه في server.js
        const bucket = req.gfs;
        await bucket.delete(new mongoose.Types.ObjectId(req.file.id));
        console.log(`Orphaned file ${req.file.id} deleted successfully.`);
      } catch (deleteError) {
        console.error('Failed to delete orphaned file from GridFS:', deleteError);
      }
    }
    res.status(500).json({ error: 'حدث خطأ غير متوقع أثناء رفع الفيديو.' });
  }
});

// بث الفيديو (مهم جدًا)
router.get('/stream/:fileId', async (req, res) => {
  try {
    // ✨ التعديل 4: استخدام req.gfs بدلاً من getGridFSBucket()
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
    console.error('Stream error:', error);
    res.status(500).json({ error: 'فشل في بث الفيديو.' });
  }
});

// حذف فيديو
router.delete('/:videoId', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'لم يتم العثور على الفيديو.' });

    if (video.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'غير مصرح لك بتنفيذ هذا الإجراء.' });
    }

    // ✨ التعديل 5: استخدام req.gfs هنا أيضًا
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

// باقي المسارات (مثل get all, like) لا تحتاج لتغيير لأنها كانت صحيحة

router.get('/', async (req, res) => { /* ... كودك هنا ... */ });
router.post('/:id/like', auth, async (req, res) => { /* ... كودك هنا ... */ });

module.exports = router;
