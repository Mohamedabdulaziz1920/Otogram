const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const User = require('../models/User');
const Video = require('../models/Video');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const router = express.Router();

const storage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    const match = ["image/png","image/jpeg","image/jpg","image/gif"];
    if (match.indexOf(file.mimetype) === -1) return null;
    return { bucketName: "images", filename: `${Date.now()}-${file.originalname}` };
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Update profile image (GridFS)
router.post('/update-profile-image', auth, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file || !req.file.id) return res.status(400).json({ error: 'No image uploaded or invalid format' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const gfs = req.imageBucket;

    // حذف الصورة القديمة
    if (user.profileImageFileId && gfs) {
      gfs.delete(user.profileImageFileId, (err) => {
        if (err) console.error('Error deleting old profile image:', err);
      });
    }

    user.profileImage = `/api/files/images/${req.file.id}`;
    user.profileImageFileId = req.file.id;
    await user.save();

    res.json({ message: 'Profile image updated successfully', profileImage: user.profileImage });

  } catch (error) {
    console.error('Error updating profile image:', error);
    res.status(500).json({ error: 'Failed to update profile image' });
  }
});

module.exports = router;
