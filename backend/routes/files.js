const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5*1024*1024 } });

router.post('/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const imageBucket = req.imageBucket;
    const uploadStream = imageBucket.openUploadStream(req.file.originalname, { contentType: req.file.mimetype });
    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', async (file) => {
      if (req.userId) {
        const User = require('../models/User');
        const user = await User.findById(req.userId);
        if (user) {
          if (user.profileImageFileId) imageBucket.delete(user.profileImageFileId, ()=>{});
          user.profileImage = `/api/files/images/${file._id}`;
          user.profileImageFileId = file._id;
          await user.save();
        }
      }

      res.status(201).json({ message: 'Image uploaded successfully', fileId: file._id, url: `/api/files/images/${file._id}` });
    });

    uploadStream.on('error', (err) => {
      console.error('Error uploading image:', err);
      res.status(500).json({ error: 'Failed to upload image' });
    });

  } catch (error) {
    console.error('Error in /upload:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Stream image
router.get('/images/:fileId', async (req, res) => {
  try {
    const imageBucket = req.imageBucket;
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);

    const files = await imageBucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) return res.status(404).json({ error: 'Image not found' });

    res.setHeader('Content-Type', files[0].contentType || 'image/jpeg');
    const downloadStream = imageBucket.openDownloadStream(fileId);
    downloadStream.pipe(res);

    downloadStream.on('error', (err) => {
      console.error('Error streaming image:', err);
      res.status(500).json({ error: 'Failed to stream image' });
    });

  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
