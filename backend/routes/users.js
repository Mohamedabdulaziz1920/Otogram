const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Video = require('../models/Video');
const auth = require('../middleware/auth');
const router = express.Router();

// إنشاء مجلدات uploads إذا لم تكن موجودة
const profilesDir = path.join(__dirname, '../uploads/profiles');
const videosDir = path.join(__dirname, '../uploads/videos');

if (!fs.existsSync(profilesDir)){
    fs.mkdirSync(profilesDir, { recursive: true });
}
if (!fs.existsSync(videosDir)){
    fs.mkdirSync(videosDir, { recursive: true });
}

// Multer configuration for profile images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -creatorPassword');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile by username
router.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password -creatorPassword -email');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate total likes
    const videos = await Video.find({ user: user._id });
    const totalLikes = videos.reduce((sum, video) => sum + video.likes.length, 0);

    res.json({
      ...user.toObject(),
      totalLikes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's videos
router.get('/:username/videos', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const videos = await Video.find({ user: user._id, isReply: false })
      .populate('user', 'username profileImage')
      .sort('-createdAt');

    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get liked videos
router.get('/liked-videos', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate({
      path: 'likedVideos',
      populate: {
        path: 'user',
        select: 'username profileImage'
      }
    });

    res.json(user.likedVideos || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile image
router.post('/update-profile-image', auth, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const profileImageUrl = `/uploads/profiles/${req.file.filename}`;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { profileImage: profileImageUrl },
      { new: true }
    ).select('-password -creatorPassword');

    res.json({ 
      profileImage: profileImageUrl,
      message: 'Profile image updated successfully' 
    });
  } catch (error) {
    console.error('Error updating profile image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set creator password
router.post('/set-creator-password', auth, async (req, res) => {
  try {
    const { creatorPassword } = req.body;
    
    await User.findByIdAndUpdate(req.userId, {
      isCreator: true,
      creatorPassword
    });

    res.json({ message: 'Creator password set successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;