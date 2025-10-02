// routes/users.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const User = require('../models/User');
const Video = require('../models/Video');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const router = express.Router();

// ✅ إعداد Multer + GridFS لتخزين صور البروفايل
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    const match = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
    if (match.indexOf(file.mimetype) === -1) {
      return null;
    }
    return {
      bucketName: "images",
      filename: `${Date.now()}-${file.originalname}`
    };
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// --- المسارات العامة ---

// Get public user profile, their videos, and replies
router.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [videos, replies] = await Promise.all([
      Video.find({ user: user._id, isReply: false })
        .populate('user', 'username profileImage')
        .sort({ createdAt: -1 }),
      Video.find({ user: user._id, isReply: true })
        .populate('user', 'username profileImage')
        .sort({ createdAt: -1 })
    ]);

    const totalLikes = [...videos, ...replies].reduce((sum, video) => sum + (video.likes?.length || 0), 0);

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

// --- المسارات المحمية للمستخدم المسجل ---

// Update profile image (GridFS) مع حذف الصورة القديمة
router.post('/update-profile-image', auth, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file || !req.file.id) {
      return res.status(400).json({ error: 'No image uploaded or invalid format' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const gfs = req.gfs; // تأكد أن gfs موجود في middleware

    // حذف الصورة القديمة إذا كانت موجودة
    if (user.profileImageFileId && gfs) {
      gfs.delete(user.profileImageFileId, (err) => {
        if (err) console.error('Error deleting old profile image:', err);
      });
    }

    user.profileImage = `/api/files/images/${req.file.id}`; // رابط البث
    user.profileImageFileId = req.file.id; // حفظ الـ fileId الجديد
    await user.save();

    res.json({
      message: 'Profile image updated successfully',
      profileImage: user.profileImage
    });

  } catch (error) {
    console.error('Error updating profile image:', error);
    res.status(500).json({ error: 'Failed to update profile image' });
  }
});

// Update username
router.put('/update-username', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.length < 3) {
      return res.status(400).json({ message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser._id.toString() !== req.userId) {
      return res.status(400).json({ message: 'اسم المستخدم مستخدم بالفعل' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { username },
      { new: true }
    ).select('-password');

    res.json({ username: user.username });

  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({ message: 'خطأ في تحديث اسم المستخدم' });
  }
});

// --- مسارات الأدمن ---
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.patch('/role/:userId', auth, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'creator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ error: 'User not found.' });

    res.json({ message: `User role updated to ${role}`, user: updatedUser });

  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

module.exports = router;
