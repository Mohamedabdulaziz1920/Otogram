const express = require('express');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const Video = require('../models/Video');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Multer + GridFS Storage
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    const match = ["video/mp4","video/avi","video/mov","video/wmv","video/flv","video/mkv","video/webm"];
    if (match.indexOf(file.mimetype) === -1) return `${Date.now()}-video-${file.originalname}`;
    return {
      bucketName: "videos",
      filename: `${Date.now()}-${file.originalname}`
    };
  }
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

// Get all main videos
router.get('/', async (req, res) => {
  try {
    const videos = await Video.find({ isReply: false })
      .populate('user', 'username profileImage')
      .populate({ path: 'replies', populate: { path: 'user', select: 'username profileImage' } })
      .sort('-createdAt');
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single video with replies
router.get('/:videoId', async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId)
      .populate('user', 'username profileImage')
      .populate({ path: 'replies', populate: { path: 'user', select: 'username profileImage' } });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload main video (only creators/admin)
router.post('/upload', auth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file || !req.file.id) return res.status(400).json({ error: 'No video uploaded' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!['creator','admin'].includes(user.role)) {
      return res.status(403).json({ error: 'You do not have permission to upload videos' });
    }

    const { description } = req.body;

    const video = new Video({
      user: req.userId,
      videoUrl: `/api/videos/stream/${req.file.id}`,
      fileId: req.file.id,
      description: description || '',
      isReply: false,
      parentVideo: null
    });

    await video.save();
    await video.populate('user', 'username profileImage');

    res.status(201).json({ message: 'Video uploaded successfully', video });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Unexpected error during upload' });
  }
});

// Stream video
router.get('/stream/:id', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const gfs = req.gfs;

    const file = await gfs.find({ _id: fileId }).toArray();
    if (!file || file.length === 0) return res.status(404).json({ error: 'Video not found' });

    res.set('Content-Type', file[0].contentType);
    const readStream = gfs.openDownloadStream(fileId);
    readStream.pipe(res);

  } catch (error) {
    console.error('Error streaming video:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

module.exports = router;
