const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const streamifier = require('streamifier');
const Video = require('../models/Video');
const User = require('../models/User');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

// --- إعداد Multer: الحفظ في الذاكرة (RAM) ---
const storage = multer.memoryStorage();
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

// 1. رفع فيديو (باستخدام البث اليدوي إلى GridFS)
router.post('/upload', auth, checkRole(['creator', 'admin']), upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم استلام أي ملف فيديو.' });
    }

    const bucket = req.gfs;
    const filename = `${Date.now()}-vid-${req.file.originalname.replace(/\s/g, '_')}`;
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: req.file.mimetype
    });

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);

    uploadStream.on('error', (error) => {
      console.error('!!! GridFS Stream Error:', error);
      return res.status(500).json({ error: 'فشل أثناء بث الملف إلى قاعدة البيانات.' });
    });

    uploadStream.on('finish', async (file) => {
      try {
        const { description } = req.body;
        const video = new Video({
          user: req.user._id,
          fileId: file._id,
          videoUrl: `/api/videos/stream/${file._id}`,
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

      } catch (saveError) {
        console.error('!!! Error saving video metadata after upload:', saveError);
        await bucket.delete(file._id);
        res.status(500).json({ error: 'فشل حفظ بيانات الفيديو بعد الرفع.' });
      }
    });

  } catch (error) {
    console.error('!!! Top-level upload error:', error);
    res.status(500).json({ error: 'حدث خطأ غير متوقع في بداية عملية الرفع.' });
  }
});

// 2. جلب جميع الفيديوهات الرئيسية (مع تتبع دقيق لتشخيص البطء)
router.get('/', async (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request for GET /api/videos`);
  try {
    console.log("Step 1: Starting database query with Video.find()...");
    
    const videos = await Video.find({ isReply: false })
      .populate('user', 'username profileImage')
      .populate({
        path: 'replies',
        populate: { path: 'user', select: 'username profileImage' }
      })
      .sort({ createdAt: -1 });

    console.log(`Step 2: Database query finished. Found ${videos.length} main videos.`);

    const validVideos = videos.filter(video => video.user);
    
    console.log(`Step 3: Filtering complete. Sending ${validVideos.length} valid videos to the client.`);
    
    res.json(validVideos);
    
    console.log(`Step 4: Response sent successfully.`);

  } catch (error) {
    console.error('!!! CRITICAL ERROR in GET /api/videos:', error);
    res.status(500).json({ error: 'فشل في جلب الفيديوهات.' });
  }
});


// 3. بث الفيديو
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
      video.likes.splice(userIndex, 1);
    } else {
      video.likes.push(req.user._id);
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
