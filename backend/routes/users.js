const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Video = require('../models/Video');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const router = express.Router();

// إنشاء مجلد uploads إذا لم يكن موجوداً
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// إعداد multer للتخزين المحلي
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadProfileImage = multer({
  storage: storage,
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

// Get public user profile, their videos, and their replies
router.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [videos, replies] = await Promise.all([
      Video.find({ user: user._id, replyTo: null })
        .populate('user', 'username profileImage')
        .sort({ createdAt: -1 }),
      Video.find({ user: user._id, replyTo: { $ne: null } })
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

// Get current logged-in user's liked videos
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

// Update profile image for the logged-in user
router.post('/update-profile-image', auth, uploadProfileImage.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      // حذف الصورة المرفوعة إذا لم يتم العثور على المستخدم
      fs.unlinkSync(path.join(uploadsDir, req.file.filename));
      return res.status(404).json({ error: 'User not found' });
    }

    // حذف الصورة القديمة إذا كانت موجودة
    if (user.profileImage && user.profileImage !== '/default-avatar.png') {
      const oldImagePath = path.join(uploadsDir, path.basename(user.profileImage));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // تحديث مسار الصورة الجديدة
    user.profileImage = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({ 
      message: 'Profile image updated successfully', 
      profileImage: user.profileImage 
    });
  } catch (error) {
    console.error('Error updating profile image:', error);
    // حذف الصورة المرفوعة في حالة الخطأ
    if (req.file) {
      fs.unlinkSync(path.join(uploadsDir, req.file.filename));
    }
    res.status(500).json({ error: 'Failed to update profile image' });
  }
});

// Update username for the logged-in user
router.put('/update-username', auth, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username || username.length < 3) {
      return res.status(400).json({ message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' });
    }
    
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser._id.toString() !== req.userId) {
      return res.status(400).json({ message: 'اسم المستخدم مستخدم بالفعل' });
    }
    
    // Update username
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

// --- المسارات المحمية للأدمن فقط ---

// Get all users (admin only)
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
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
