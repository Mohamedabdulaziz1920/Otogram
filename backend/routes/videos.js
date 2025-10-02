// routes/videos.js
const express = require('express');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const Video = require('../models/Video');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// ✅ Multer + GridFS configuration
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    const match = [
      "video/mp4", "video/avi", "video/mov",
      "video/wmv", "video/flv", "video/mkv", "video/webm"
    ];

    if (match.indexOf(file.mimetype) === -1) {
      return `${Date.now()}-video-${file.originalname}`;
    }

    return {
      bucketName: "videos",
      filename: `${Date.now()}-${file.originalname}`
    };
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// ✅ Get all main videos
router.get('/', async (req, res) => {
  try {
    const videos = await Video.find({ isReply: false })
      .populate('user', 'username profileImage')
      .populate({
        path: 'replies',
        populate: { path: 'user', select: 'username profileImage' }
      })
      .sort('-createdAt');
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get single video with replies
router.get('/:videoId', async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId)
      .populate('user', 'username profileImage')
      .populate({
        path: 'replies',
        populate: { path: 'user', select: 'username profileImage' }
      });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Upload main video
router.post('/upload', auth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file || !req.file.id) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { description, uploadPassword } = req.body;
    const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || 'upload123';

    if (!uploadPassword) {
      return res.status(400).json({ error: 'كلمة مرور الرفع مطلوبة' });
    }
    if (uploadPassword !== UPLOAD_PASSWORD) {
      return res.status(403).json({ error: 'كلمة مرور الرفع غير صحيحة' });
    }

    const video = new Video({
      user: req.userId,
      videoUrl: `/api/videos/stream/${req.file.id}`, // stream endpoint
      fileId: req.file.id, // ✅ تخزين الـ fileId
      description: description || '',
      isReply: false,
      parentVideo: null
    });

    await video.save();
    await video.populate('user', 'username profileImage');

    res.status(201).json({ message: 'تم رفع الفيديو بنجاح', video });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Upload reply video
router.post('/reply/:videoId', auth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file || !req.file.id) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { description } = req.body;
    const parentVideoId = req.params.videoId;

    const parentVideo = await Video.findById(parentVideoId);
    if (!parentVideo) return res.status(404).json({ error: 'Parent video not found' });
    if (parentVideo.isReply) return res.status(400).json({ error: 'Cannot reply to a reply video' });

    const replyVideo = new Video({
      user: req.userId,
      videoUrl: `/api/videos/stream/${req.file.id}`,
      fileId: req.file.id, // ✅ تخزين الـ fileId
      description: description || '',
      isReply: true,
      parentVideo: parentVideoId
    });

    await replyVideo.save();

    parentVideo.replies.push(replyVideo._id);
    await parentVideo.save();

    await replyVideo.populate('user', 'username profileImage');

    res.status(201).json({ message: 'تم رفع الرد بنجاح', video: replyVideo });
  } catch (error) {
    console.error('Error uploading reply:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Stream video by GridFS ID
router.get('/stream/:id', async (req, res) => {
  try {
    const gfs = req.gfs;
    const fileId = new mongoose.Types.ObjectId(req.params.id);

    const file = await gfs.files.findOne({ _id: fileId });
    if (!file) return res.status(404).json({ error: 'File not found' });

    res.set('Content-Type', file.contentType);

    const readstream = gfs.createReadStream({ _id: fileId });
    readstream.pipe(res);
  } catch (error) {
    console.error('Error streaming video:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Like/Unlike video
router.post('/:videoId/like', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    const user = await User.findById(req.userId);

    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isLiked = video.likes.includes(req.userId);
    if (isLiked) {
      video.likes = video.likes.filter(id => id.toString() !== req.userId);
      user.likedVideos = user.likedVideos.filter(id => id.toString() !== video._id.toString());
    } else {
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

// ✅ Increment views
router.post('/:videoId/view', async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.videoId,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json({ views: video.views });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
