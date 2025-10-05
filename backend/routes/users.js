const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const streamifier = require('streamifier'); // استيراد المكتبة المساعدة
const User = require('../models/User');
const Video = require('../models/Video');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

// --- إعداد Multer لرفع الصور إلى الذاكرة (RAM) ---
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الصورة غير مدعوم.'), false);
    }
  }
});

// ================== المسارات الخاصة بالمستخدم الحالي ==================

// ✨ تحديث صورة البروفايل بالطريقة الجديدة والناجحة ✨
router.post('/me/update-profile-image', auth, upload.single('profileImage'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم استلام أي ملف صورة.' });
    }
    
    // استخدم imageBucket الذي أعددناه في server.js
    const bucket = req.imageBucket;
    const filename = `profile-${req.user._id}-${Date.now()}`;
    const uploadStream = bucket.openUploadStream(filename, { contentType: req.file.mimetype });

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);

    uploadStream.on('error', (error) => {
      console.error('!!! GridFS Image Stream Error:', error);
      return res.status(500).json({ error: 'فشل أثناء بث الصورة إلى قاعدة البيانات.' });
    });

    uploadStream.on('finish', async () => {
      try {
        const newProfileImageUrl = `/api/files/images/${uploadStream.id}`;

        // ملاحظة: يجب حذف الصورة القديمة من GridFS (ميزة متقدمة)
        // const oldFileId = req.user.profileImage?.split('/').pop();
        // if (oldFileId) { await bucket.delete(new mongoose.Types.ObjectId(oldFileId)); }

        const updatedUser = await User.findByIdAndUpdate(
          req.user._id,
          { profileImage: newProfileImageUrl },
          { new: true }
        ).select('-password');
        
        res.status(200).json({
          message: 'تم تحديث صورة البروفايل بنجاح',
          profileImage: updatedUser.profileImage
        });

      } catch (saveError) {
        console.error('!!! Error updating user profile image:', saveError);
        await bucket.delete(uploadStream.id);
        res.status(500).json({ error: 'فشل تحديث بيانات المستخدم بعد رفع الصورة.' });
      }
    });

  } catch (error) {
    console.error('!!! Top-level profile image upload error:', error);
    res.status(500).json({ error: 'حدث خطأ غير متوقع في بداية عملية الرفع.' });
  }
});


// جلب الفيديوهات المعجب بها (الكود سليم)
router.get('/me/liked-videos', auth, async (req, res) => {
  try {
    const likedVideos = await Video.find({ likes: req.user._id })
      .populate('user', 'username profileImage')
      .sort({ createdAt: -1 });
    res.json(likedVideos);
  } catch (error) {
    console.error('Error fetching liked videos:', error);
    res.status(500).json({ error: 'Failed to fetch liked videos' });
  }
});

// تحديث اسم المستخدم (الكود سليم)
router.patch('/me/update-username', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }
    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id, { username }, { new: true }
    );
    res.json({ message: 'Username updated successfully', username: updatedUser.username });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update username.' });
  }
});


// ================== مسارات الأدمن ==================

// جلب جميع المستخدمين (الكود سليم)
router.get('/', auth, isAdmin, async (req, res) => { /* ... كودك هنا سليم ... */ });

// تحديث دور المستخدم (الكود سليم)
router.patch('/role/:userId', auth, isAdmin, async (req, res) => { /* ... كودك هنا سليم ... */ });


// ================== المسارات العامة ==================

// جلب بروفايل مستخدم عبر اسم المستخدم (الكود سليم مع تحسين بسيط)
router.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [videos, replies] = await Promise.all([
      Video.find({ user: user._id, isReply: false }).sort({ createdAt: -1 }),
      Video.find({ user: user._id, isReply: true }).sort({ createdAt: -1 })
    ]);

    const totalLikes = videos.reduce((sum, video) => sum + (video.likes?.length || 0), 0);

    res.json({
      user,
      videos,
      replies,
      stats: {
        videosCount: videos.length,
        repliesCount: replies.length,
        totalLikes
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;