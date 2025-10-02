// ملف: routes/files.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const auth = require('../middleware/auth');
const router = express.Router();

// ✅ Multer + GridFS storage configuration
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    // قبول فقط الصور
    const match = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
    if (match.indexOf(file.mimetype) === -1) {
      return null;
    }
    return {
      bucketName: "images", // bucket خاص بالصور
      filename: `${Date.now()}-${file.originalname}`
    };
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// ✅ رفع صورة جديدة
router.post('/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file || !req.file.id) {
      return res.status(400).json({ error: 'No image uploaded or invalid format' });
    }

    // نقدر نرجع للـ frontend رابط البث
    const imageUrl = `/api/files/images/${req.file.id}`;

    res.status(201).json({
      message: 'Image uploaded successfully',
      fileId: req.file.id,
      imageUrl
    });

  } catch (error) {
    console.error('❌ Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// ✅ بث الصورة من GridFS
router.get('/images/:fileId', async (req, res) => {
  try {
    const gfs = req.gfs;
    if (!gfs) {
      return res.status(500).json({ error: 'GridFS not initialized yet' });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    const files = await gfs.find({ _id: fileId }).toArray();

    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.setHeader('Content-Type', files[0].contentType || 'image/jpeg');
    gfs.openDownloadStream(fileId).pipe(res);

  } catch (error) {
    console.error('❌ Error streaming image:', error);
    res.status(500).json({ error: 'Failed to stream image' });
  }
});

module.exports = router;
