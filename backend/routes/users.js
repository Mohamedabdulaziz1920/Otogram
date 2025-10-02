const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const User = require('../models/User');
const Video = require('../models/Video');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const { getImageBucket } = require('../config/gridfs');

const router = express.Router();

// --- إعداد GridFS Storage لصور الملف الشخصي ---
const imageStorage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    if (!file.mimetype.startsWith('image/')) {
      return null;
    }
    return {
      filename: `profile-${req.userId}-${Date.now()}`,
      bucketName: 'images',
    };
  }
});

const uploadProfileImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ================== المسارات الخاصة بالمستخدم الحالي ==================

// جلب الفيديوهات المعجب بها
router.get('/me/liked-videos', auth, async (req, res) => {
  try {
    const likedVideos = await Video.find({ likes: req.userId })
      .populate('user', 'username profileImage')
      .sort({ createdAt: -1 });

    res.json(likedVideos);
  } catch (error) {
    console.error('Error fetching liked videos:', error);
    res.status(500).json({ error: 'Failed to fetch liked videos' });
  }
});

// تحديث صورة البروفايل
router.post('/me/update-profile-image', auth, uploadProfileImage.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const imageBucket = getImageBucket();
      await imageBucket.delete(req.file.id);
      return res.status(404).json({ error: 'User not found' });
    }

    // حذف الصورة القديمة
    if (user.profileImageFileId) {
      try {
        const imageBucket = getImageBucket();
        await imageBucket.delete(new mongoose.Types.ObjectId(user.profileImageFileId));
      } catch (err) {
        console.error('Failed to delete old profile image from GridFS:', err);
      }
    }

    user.profileImage = `/api/files/images/${req.file.id}`;
    user.profileImageFileId = req.file.id;
    await user.save();

    res.json({ message: 'Profile image updated successfully', profileImage: user.profileImage });
  } catch (error) {
    console.error('Error updating profile image:', error);
    res.status(500).json({ error: 'Failed to update profile image' });
  }
});

// تحديث اسم المستخدم
router.patch('/me/update-username', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser._id.toString() !== req.userId) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { username },
      { new: true }
    );

    res.json({ message: 'Username updated successfully', username: updatedUser.username });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update username.' });
  }
});

// ================== مسارات الأدمن ==================

// جلب جميع المستخدمين
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// تحديث دور المستخدم
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
    );

    if (!updatedUser) return res.status(404).json({ error: 'User not found.' });

    res.json({ message: `User role updated to ${role}`, user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

// ================== المسارات العامة ==================

// جلب بروفايل مستخدم عبر اسم المستخدم
router.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
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

// جلب مستخدم عبر الـ ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
