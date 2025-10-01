const express = require('express');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const User = require('../models/User');
const Video = require('../models/Video');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const { getImageBucket } = require('../config/gridfs');
const router = express.Router();

// --- إعداد GridFS Storage لصور الملف الشخصي ---
const imageStorage = new GridFsStorage({
  db: mongoose.connection,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      const filename = 'profile-' + req.userId + '-' + Date.now();
      const fileInfo = {
        filename: filename,
        bucketName: 'images',
      };
      resolve(fileInfo);
    });
  }
});

const uploadProfileImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// --- المسارات العامة ---

// Get public user profile, their videos, and their replies
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
  } catch (error) { // ✨✨ تم تصحيح الخطأ هنا ✨✨
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- المسارات المحمية للمستخدم المسجل ---

// Get current logged-in user's liked videos
router.get('/me/liked-videos', auth, async (req, res) => {
    try {
      const likedVideos = await Video.find({ likes: req.userId })
        .populate('user', 'username profileImage')
        .sort({ createdAt: -1 });
  
      res.json(likedVideos);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch liked videos' });
    }
  });

// Update profile image for the logged-in user
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