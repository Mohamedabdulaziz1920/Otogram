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

// ==================== المسارات (بالترتيب الصحيح) ====================

// 1️⃣ رفع فيديو أساسي
router.post('/upload', auth, checkRole(['creator', 'admin']), upload.single('video'), (req, res) => {
  try {
    if (!req.file) { 
      return res.status(400).json({ error: 'لم يتم استلام أي ملف فيديو.' }); 
    }
    
    const bucket = req.gfs;
    const filename = `${Date.now()}-vid-${req.file.originalname.replace(/\s/g, '_')}`;
    const uploadStream = bucket.openUploadStream(filename, { contentType: req.file.mimetype });
    
    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    
    uploadStream.on('error', (error) => {
      console.error('!!! GridFS Stream Error:', error);
      return res.status(500).json({ error: 'فشل أثناء بث الملف إلى قاعدة البيانات.' });
    });
    
    uploadStream.on('finish', async () => {
      try {
        const { description } = req.body;
        const video = new Video({
          user: req.user._id,
          fileId: uploadStream.id,
          videoUrl: `/api/videos/stream/${uploadStream.id}`,
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
        console.error('!!! Error saving video metadata:', saveError);
        await bucket.delete(uploadStream.id);
        res.status(500).json({ error: 'فشل حفظ بيانات الفيديو بعد الرفع.' });
      }
    });
  } catch (error) {
    console.error('!!! Top-level upload error:', error);
    res.status(500).json({ error: 'حدث خطأ غير متوقع في بداية عملية الرفع.' });
  }
});

// 2️⃣ رفع فيديو كرد
router.post('/reply/:videoId', auth, checkRole(['user', 'creator', 'admin']), upload.single('video'), async (req, res) => {
  console.log('📥 Reply upload request received for video:', req.params.videoId);
  
  try {
    if (!req.file) {
      console.log('❌ No file received');
      return res.status(400).json({ error: 'لم يتم استلام أي ملف فيديو للرد.' });
    }

    const parentVideoId = req.params.videoId;
    
    // ✨ التحقق من وجود الفيديو الأصلي أولاً
    const parentVideo = await Video.findById(parentVideoId);
    if (!parentVideo) {
      console.log('❌ Parent video not found:', parentVideoId);
      return res.status(404).json({ error: 'الفيديو الأصلي غير موجود.' });
    }
    
    console.log('✅ Parent video exists, proceeding with upload...');

    const bucket = req.gfs;
    const filename = `${Date.now()}-reply-${req.file.originalname.replace(/\s/g, '_')}`;
    const uploadStream = bucket.openUploadStream(filename, { contentType: req.file.mimetype });

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);

    uploadStream.on('error', (error) => {
      console.error('!!! GridFS Reply Stream Error:', error);
      return res.status(500).json({ error: 'فشل أثناء بث ملف الرد.' });
    });

    uploadStream.on('finish', async () => {
      try {
        console.log('✅ File uploaded to GridFS, creating reply document...');
        
        const replyVideo = new Video({
          user: req.user._id,
          fileId: uploadStream.id,
          videoUrl: `/api/videos/stream/${uploadStream.id}`,
          description: req.body.description || '',
          isReply: true,
          parentVideo: parentVideoId,
        });
        
        // ✅ الـ middleware سيقوم تلقائيًا بإضافة الرد للفيديو الأصلي
        await replyVideo.save();
        console.log('✅ Reply video saved:', replyVideo._id);

        const replyResponse = replyVideo.toObject();
        replyResponse.user = {
            _id: req.user._id,
            username: req.user.username,
            profileImage: req.user.profileImage
        };
        
        console.log('✅ Reply upload complete, sending response');
        res.status(201).json({ message: 'تم إضافة الرد بنجاح', video: replyResponse });

      } catch (saveError) {
        console.error('!!! Error saving reply metadata:', saveError);
        await bucket.delete(uploadStream.id);
        res.status(500).json({ error: 'فشل حفظ بيانات الرد بعد الرفع.' });
      }
    });

  } catch (error) {
    console.error('!!! Top-level reply error:', error);
    res.status(500).json({ error: 'حدث خطأ غير متوقع في بداية عملية الرد.' });
  }
});

// 3️⃣ جلب جميع الفيديوهات الرئيسية
router.get('/', async (req, res) => {
  try {
    console.log('📥 Fetching main videos...');
    
    const videos = await Video.find({ isReply: false })
      .populate('user', 'username profileImage')
      .populate({
        path: 'replies',
        match: { isReply: true },
        populate: { path: 'user', select: 'username profileImage' },
        options: { sort: { createdAt: 1 } }
      })
      .sort({ createdAt: -1 });
    
    const validVideos = videos
      .filter(video => video.user)
      .map(video => {
        const uniqueReplies = video.replies
          ? Array.from(new Map(
              video.replies
                .filter(reply => reply && reply.user)
                .map(reply => [reply._id.toString(), reply])
            ).values())
          : [];
        
        return {
          ...video.toObject(),
          replies: uniqueReplies
        };
      });
    
    console.log(`✅ Fetched ${validVideos.length} videos`);
    res.json(validVideos);
    
  } catch (error) {
    console.error('❌ Fetch videos error:', error);
    res.status(500).json({ error: 'فشل في جلب الفيديوهات.' });
  }
});

// 4️⃣ بث الفيديو
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

// 5️⃣ إعجاب/إلغاء إعجاب (قبل /:videoId)
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

// 6️⃣ حذف فيديو (قبل /:videoId)
router.delete('/:videoId', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) {
      return res.status(404).json({ error: 'لم يتم العثور على الفيديو.' });
    }

    if (video.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'غير مصرح لك بتنفيذ هذا الإجراء.' });
    }

    const bucket = req.gfs;

    // حذف الردود إذا كان فيديو رئيسي
    if (!video.isReply) {
      const replies = await Video.find({ parentVideo: video._id });
      for (const reply of replies) {
        if (reply.fileId) {
          await bucket.delete(new mongoose.Types.ObjectId(reply.fileId));
        }
        await reply.deleteOne();
      }
    }

    // حذف الفيديو نفسه
    if (video.fileId) {
      await bucket.delete(new mongoose.Types.ObjectId(video.fileId));
    }
    
    await video.deleteOne();
    
    res.json({ message: 'تم حذف الفيديو بنجاح.' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'فشل في حذف الفيديو.' });
  }
});

// 7️⃣ جلب فيديو واحد مع الردود (في النهاية!) ✨
router.get('/:videoId', async (req, res) => {
  try {
    console.log('📥 Fetching single video:', req.params.videoId);
    
    const video = await Video.findById(req.params.videoId)
      .populate('user', 'username profileImage')
      .populate({
        path: 'replies',
        match: { isReply: true },
        populate: { path: 'user', select: 'username profileImage' },
        options: { sort: { createdAt: 1 } }
      });

    if (!video) {
      console.log('❌ Video not found');
      return res.status(404).json({ error: 'الفيديو غير موجود' });
    }

    console.log('✅ Video found:', video._id);
    res.json(video);
    
  } catch (error) {
    console.error('❌ Error fetching video:', error);
    res.status(500).json({ error: 'فشل في جلب الفيديو' });
  }
});

module.exports = router;
