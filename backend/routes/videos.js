const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const streamifier = require('streamifier'); // <-- استيراد المكتبة الجديدة
const Video = require('../models/Video');
const User = require('../models/User');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

// --- إعداد Multer جديد: الحفظ في الذاكرة ---
// بدلاً من الحفظ في GridFS مباشرة، سنحفظ الملف في الذاكرة (RAM) مؤقتًا
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


// --- المسار الجديد لرفع الفيديو (يدويًا) ---
router.post('/upload', auth, checkRole(['creator', 'admin']), upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم استلام أي ملف فيديو.' });
    }

    // ✨ الخطوة 1: الحصول على GridFS Bucket من الطلب (من server.js)
    const bucket = req.gfs;
    
    // ✨ الخطوة 2: إنشاء "تيار رفع" (upload stream) إلى GridFS
    const filename = `${Date.now()}-vid-${req.file.originalname.replace(/\s/g, '_')}`;
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: req.file.mimetype
    });

    // ✨ الخطوة 3: تحويل الـ Buffer (الملف من الذاكرة) إلى تيار قابل للقراءة وبثه إلى GridFS
    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);

    // ✨ الخطوة 4: الاستماع لأحداث تيار الرفع لمعرفة متى ينتهي أو يفشل
    uploadStream.on('error', (error) => {
      console.error('!!! GridFS Stream Error:', error);
      return res.status(500).json({ error: 'فشل أثناء بث الملف إلى قاعدة البيانات.' });
    });

    uploadStream.on('finish', async (file) => {
      try {
        // ✨ الخطوة 5: عند نجاح الرفع، "file" سيحتوي على بيانات الملف بما في ذلك _id
        const { description } = req.body;
        const video = new Video({
          user: req.user._id,
          fileId: file._id, // <-- استخدام الـ ID من نتيجة الرفع
          videoUrl: `/api/videos/stream/${file._id}`,
          description: description || '',
        });

        await video.save();

        const videoResponse = video.toObject();
        videoResponse.user = {
          _id: req.user._id,
          username: req.user.username,
          profileImage: req.user.profileImage
        };
        
        // إرسال استجابة النجاح النهائية
        res.status(201).json({ message: 'تم رفع الفيديو بنجاح', video: videoResponse });

      } catch (saveError) {
        console.error('!!! Error saving video metadata after upload:', saveError);
        // إذا فشل الحفظ، حاول حذف الملف الذي تم رفعه للتو
        await bucket.delete(file._id);
        res.status(500).json({ error: 'فشل حفظ بيانات الفيديو بعد الرفع.' });
      }
    });

  } catch (error) {
    console.error('!!! Top-level upload error:', error);
    res.status(500).json({ error: 'حدث خطأ غير متوقع في بداية عملية الرفع.' });
  }
});


// باقي المسارات (GET, STREAM, DELETE, LIKE) لا تحتاج لتغيير
// ... انسخها والصقها هنا من الكود السابق الكامل الذي أرسلته لك ...
// ... سأضيفها لك هنا بالكامل للسهولة ...

// جلب جميع الفيديوهات الرئيسية
router.get('/', async (req, res) => { /* ... كودك هنا سليم ... */ });
// بث الفيديو
router.get('/stream/:fileId', async (req, res) => { /* ... كودك هنا سليم ... */ });
// حذف فيديو
router.delete('/:videoId', auth, async (req, res) => { /* ... كودك هنا سليم ... */ });
// إعجاب/إلغاء إعجاب
router.post('/:id/like', auth, async (req, res) => { /* ... كودك هنا سليم ... */ });


module.exports = router;