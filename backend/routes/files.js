// routes/files.js
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const router = express.Router();

// --- إعداد Multer لتخزين الصور في GridFS ---
const storage = multer.memoryStorage(); // التخزين مؤقت في الذاكرة
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// --- رفع صورة (Protected) ---
router.post('/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const imageBucket = req.imageBucket;
    const uploadStream = imageBucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', async (file) => {
      // تحديث المستخدم إذا كان هناك userId
      if (req.userId) {
        const User = require('../models/User');
        const user = await User.findById(req.userId);

        if (user) {
          // حذف الصورة القديمة إذا موجودة
          if (user.profileImageFileId) {
            imageBucket.delete(user.profileImageFileId, (err) => {
              if (err) console.error('Error deleting old profile image:', err);
            });
          }

          user.profileImage = `/api/files/images/${file._id}`;
          user.profileImageFileId = file._id;
          await user.save();
        }
      }

      res.status(201).json({
        message: 'Image uploaded successfully',
        fileId: file._id,
        url: `/api/files/images/${file._id}`
      });
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

// --- بث الصورة (stream) ---
router.get('/images/:fileId', async (req, res) => {
  try {
    const imageBucket = req.imageBucket;
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);

    const files = await imageBucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

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
