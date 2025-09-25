const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// إنشاء مجلد uploads/videos إذا لم يكن موجوداً
const videosDir = path.join(__dirname, '../uploads/videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videosDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max للفيديوهات
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|wmv|flv|mkv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('video/');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (mp4, avi, mov, wmv, flv, mkv, webm)'));
    }
  }
});

// Get all main videos (public - no auth required)
router.get('/', async (req, res) => {
  try {
    const videos = await Video.find({ isReply: false })
      .populate('user', 'username profileImage')
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
          select: 'username profileImage'
        }
      })
      .sort('-createdAt');
    
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single video with replies (public - no auth required)
router.get('/:videoId', async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId)
      .populate('user', 'username profileImage')
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
          select: 'username profileImage'
        }
      });
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload main video (any logged in user with upload password)
router.post('/upload', auth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { description, uploadPassword } = req.body;
    
    // كلمة مرور الرفع العامة (يمكنك تغييرها أو جعلها في .env)
    const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || 'upload123';
    
    // التحقق من كلمة مرور الرفع
    if (!uploadPassword) {
      return res.status(400).json({ error: 'كلمة مرور الرفع مطلوبة' });
    }
    
    if (uploadPassword !== UPLOAD_PASSWORD) {
      return res.status(403).json({ error: 'كلمة مرور الرفع غير صحيحة' });
    }

    // Create video
    const video = new Video({
      user: req.userId,
      videoUrl: `/uploads/videos/${req.file.filename}`,
      description: description || '',
      isReply: false,
      parentVideo: null
    });

    await video.save();
    await video.populate('user', 'username profileImage');

    res.status(201).json({
      message: 'تم رفع الفيديو بنجاح',
      video
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    // حذف الملف في حالة الخطأ
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Upload reply video (no password required - auth required)
router.post('/reply/:videoId', auth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { description } = req.body;
    const parentVideoId = req.params.videoId;

    // Check if parent video exists
    const parentVideo = await Video.findById(parentVideoId);
    if (!parentVideo) {
      return res.status(404).json({ error: 'Parent video not found' });
    }

    // Check if parent video is a main video (not a reply)
    if (parentVideo.isReply) {
      return res.status(400).json({ error: 'Cannot reply to a reply video' });
    }

    // Create reply video - لا حاجة لكلمة مرور
    const replyVideo = new Video({
      user: req.userId,
      videoUrl: `/uploads/videos/${req.file.filename}`,
      description: description || '',
      isReply: true,
      parentVideo: parentVideoId
    });

    await replyVideo.save();
    
    // Add reply to parent video
    parentVideo.replies.push(replyVideo._id);
    await parentVideo.save();

    await replyVideo.populate('user', 'username profileImage');

    res.status(201).json({
      message: 'تم رفع الرد بنجاح',
      video: replyVideo
    });
  } catch (error) {
    console.error('Error uploading reply:', error);
    // حذف الملف في حالة الخطأ
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete video (auth required - owner only)
router.delete('/:videoId', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check permissions
    if (video.user.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this video' });
    }

    // If it's a main video, delete all its replies
    if (!video.isReply) {
      const replies = await Video.find({ parentVideo: video._id });
      
      // حذف ملفات الردود
      for (const reply of replies) {
        const replyPath = path.join(__dirname, '..', reply.videoUrl);
        fs.unlink(replyPath, (err) => {
          if (err) console.error('Error deleting reply file:', err);
        });
      }
      
      // حذف الردود من قاعدة البيانات
      await Video.deleteMany({ parentVideo: video._id });
    }

    // Remove from parent's replies array if it's a reply
    if (video.isReply && video.parentVideo) {
      await Video.findByIdAndUpdate(video.parentVideo, {
        $pull: { replies: video._id }
      });
    }

    // حذف ملف الفيديو
    const videoPath = path.join(__dirname, '..', video.videoUrl);
    fs.unlink(videoPath, (err) => {
      if (err) console.error('Error deleting video file:', err);
    });

    await video.deleteOne();
    res.json({ message: 'تم حذف الفيديو بنجاح' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete reply (auth required - reply owner or main video owner)
router.delete('/reply/:replyId', auth, async (req, res) => {
  try {
    const reply = await Video.findById(req.params.replyId);
    
    if (!reply || !reply.isReply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    const parentVideo = await Video.findById(reply.parentVideo);
    
    if (!parentVideo) {
      return res.status(404).json({ error: 'Parent video not found' });
    }
    
    // Check if user is either the reply owner or the main video owner
    const isReplyOwner = reply.user.toString() === req.userId;
    const isMainVideoOwner = parentVideo.user.toString() === req.userId;
    
    if (!isReplyOwner && !isMainVideoOwner) {
      return res.status(403).json({ error: 'Not authorized to delete this reply' });
    }

    // Remove from parent's replies array
    await Video.findByIdAndUpdate(reply.parentVideo, {
      $pull: { replies: reply._id }
    });

    // حذف ملف الفيديو
    const videoPath = path.join(__dirname, '..', reply.videoUrl);
    fs.unlink(videoPath, (err) => {
      if (err) console.error('Error deleting reply file:', err);
    });

    await reply.deleteOne();
    res.json({ message: 'تم حذف الرد بنجاح' });
  } catch (error) {
    console.error('Error deleting reply:', error);
    res.status(500).json({ error: error.message });
  }
});

// Like/Unlike video (auth required)
router.post('/:videoId/like', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    const user = await User.findById(req.userId);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isLiked = video.likes.includes(req.userId);

    if (isLiked) {
      // Unlike
      video.likes = video.likes.filter(id => id.toString() !== req.userId);
      user.likedVideos = user.likedVideos.filter(id => id.toString() !== video._id.toString());
    } else {
      // Like
      video.likes.push(req.userId);
      user.likedVideos.push(video._id);
    }

    await video.save();
    await user.save();

    res.json({ 
      liked: !isLiked, 
      likesCount: video.likes.length,
      message: isLiked ? 'تم إلغاء الإعجاب' : 'تم الإعجاب'
    });
  } catch (error) {
    console.error('Error liking/unliking video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Increment video views (public - no auth required)
router.post('/:videoId/view', async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.videoId,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ views: video.views });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;