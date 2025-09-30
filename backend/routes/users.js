const express = require('express');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const User = require('../models/User');
const Video = require('../models/Video');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const { getImageBucket } = require('../config/gridfs'); // سنحتاج هذا لحذف الصور
const router = express.Router();

// --- إعداد GridFS Storage لرفع صور الملف الشخصي ---
const imageStorage = new GridFsStorage({
  db: mongoose.connection,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      const filename = 'profile-' + req.userId + '-' + Date.now();
      const fileInfo = {
        filename: filename,
        bucketName: 'images', // ✨ استخدام bucket مختلف للصور
      };
      resolve(fileInfo);
    });
  }
});

const uploadProfileImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// --- المسارات العامة ---

// Get public user profile and their videos
router.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const videos = await Video.find({ user: user._id, isReply: false }).sort({ createdAt: -1 });
    const totalLikes = videos.reduce((sum, video) => sum + (video.likes?.length || 0), 0);

    res.json({
      user,
      videos,
      stats: { videosCount: videos.length, totalLikes }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- المسارات المحمية للمستخدم المسجل ---

// Update profile image for the logged-in user
router.post('/me/update-profile-image', auth, uploadProfileImage.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      // حذف الصورة المرفوعة إذا لم يتم العثور على المستخدم
      const imageBucket = getImageBucket();
      await imageBucket.delete(req.file.id);
      return res.status(404).json({ error: 'User not found' });
    }

    // ✨ حذف الصورة القديمة من GridFS إذا كانت موجودة
    if (user.profileImageFileId) {
      try {
        const imageBucket = getImageBucket();
        await imageBucket.delete(new mongoose.Types.ObjectId(user.profileImageFileId));
      } catch (err) {
        console.error('Failed to delete old profile image from GridFS:', err);
      }
    }

    // تحديث المستخدم بالمعلومات الجديدة من GridFS
    user.profileImage = `/api/files/images/${req.file.id}`; // رابط بث الصورة
    user.profileImageFileId = req.file.id; // ID لحذفها لاحقًا
    await user.save();

    res.json({ message: 'Profile image updated successfully', user });
  } catch (error) {
    console.error('Error updating profile image:', error);
    res.status(500).json({ error: 'Failed to update profile image' });
  }
});


// --- المسارات المحمية للأدمن فقط ---

// Get all users (admin only)
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update a user's role (admin only)
router.patch('/role/:userId', auth, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'creator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.userId, { role }, { new: true });
    if (!updatedUser) return res.status(404).json({ error: 'User not found.' });

    res.json({ message: `User role updated to ${role}`, user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});


module.exports = router;
