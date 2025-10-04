const express = require('express');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const Video = require('../models/Video');
const User = require('../models/User'); // <-- تم استيراد موديل المستخدم
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const { getGridFSBucket } = require('../config/gridfs'); // تأكد من أن هذا المسار صحيح

const router = express.Router();

// --- إعداد GridFS Storage للفيديوهات ---
const storage = new GridFsStorage({
  db: mongoose.connection,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      // التحقق من نوع الملف هنا مباشرة قبل إنشاء اسم الملف
      const match = ["video/mp4", "video/quicktime", "video/x-matroska", "video/webm"];
      if (match.indexOf(file.mimetype) === -1) {
        return reject(new Error('نوع الفيديو غير مدعوم.'));
      }
      
      const filename = `video-${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;
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
});

// --- المسارات ---

// رفع فيديو أساسي
// POST /api/videos/upload
router.post('/upload', auth, checkRole(['creator', 'admin']), upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم رفع أي ملف فيديو.' });
    }
    
    const { description } = req.body; // يمكنك إضافة حقل الوصف إذا أردت

    const video = new Video({
      user: req.user._id, // ✨ استخدام كائن المستخدم المرفق بالطلب
      fileId: req.file.id,
      videoUrl: `/api/videos/stream/${req.file.id}`,
      description: description || '',
      isReply: false,
    });

    await video.save();

    // ✨ تحسين الأداء: لا حاجة لـ populate، نُرجع بيانات المستخدم مباشرة
    const videoResponse = video.toObject();
    videoResponse.user = {
      _id: req.user._id,
      username: req.user.username,
      profileImage: req.user.profileImage
    };
    
    res.status(201).json({ message: 'تم رفع الفيديو بنجاح', video: videoResponse });

  } catch (error) {
    console.error('Upload error:', error);
    // محاولة حذف الملف من GridFS في حالة فشل حفظ البيانات الوصفية
    if (req.file && req.file.id) {
      try {
        const bucket = getGridFSBucket();
        await bucket.delete(new mongoose.Types.ObjectId(req.file.id));
        console.log(`Orphaned file ${req.file.id} deleted successfully.`);
      } catch (deleteError) {
        console.error('Failed to delete orphaned file from GridFS:', deleteError);
      }
    }
    res.status(500).json({ error: 'حدث خطأ غير متوقع أثناء رفع الفيديو.' });
  }
});


// جلب جميع الفيديوهات الرئيسية
// GET /api/videos
router.get('/', async (req, res) => {
  try {
    const videos = await Video.find({ isReply: false })
      .populate('user', 'username profileImage') // Populate ضروري هنا لأننا نجلب قائمة
      .populate({
        path: 'replies',
        populate: { path: 'user', select: 'username profileImage' }
      })
      .sort({ createdAt: -1 });
    
    // فلتر لإزالة الفيديوهات التي يملكها مستخدمون تم حذفهم (إن وجد)
    const validVideos = videos.filter(video => video.user);
    res.json(validVideos);

  } catch (error) {
    console.error('Fetch videos error:', error);
    res.status(500).json({ error: 'فشل في جلب الفيديوهات.' });
  }
});

// بث الفيديو
// GET /api/videos/stream/:fileId
router.get('/stream/:fileId', async (req, res) => {
  try {
    const bucket = getGridFSBucket();
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
// DELETE /api/videos/:videoId
router.delete('/:videoId', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'لم يتم العثور على الفيديو.' });

    // التحقق من الصلاحيات (المالك أو الأدمن)
    // نستخدم req.user الذي تم جلبه من auth middleware
    if (video.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'غير مصرح لك بتنفيذ هذا الإجراء.' });
    }

    const bucket = getGridFSBucket();

    // إذا كان الفيديو رئيسيًا، قم بحذف جميع ردوده وملفاتها أولاً
    if (!video.isReply) {
      const replies = await Video.find({ parentVideo: video._id });
      for (const reply of replies) {
        if (reply.fileId) await bucket.delete(new mongoose.Types.ObjectId(reply.fileId));
        await reply.deleteOne();
      }
    }

    // حذف ملف الفيديو نفسه من GridFS
    if (video.fileId) await bucket.delete(new mongoose.Types.ObjectId(video.fileId));
    
    // حذف بيانات الفيديو الوصفية
    await video.deleteOne();
    res.json({ message: 'تم حذف الفيديو بنجاح.' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'فشل في حذف الفيديو.' });
  }
});

// إعجاب/إلغاء إعجاب
// POST /api/videos/:id/like
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

// ملاحظة: مسار الرد '/reply/:videoId' لم يكن مكتملًا في الكود الأصلي، يمكنك إضافته هنا بنفس الطريقة المحسنة.

module.exports = router;
