// ملف: routes/files.js
const express = require('express');
const mongoose = require('mongoose');
const { getImageBucket } = require('../config/gridfs');
const router = express.Router();

// Stream image from GridFS
router.get('/images/:fileId', async (req, res) => {
  try {
    const imageBucket = getImageBucket();
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);

    const files = await imageBucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.setHeader('Content-Type', files[0].contentType || 'image/jpeg');
    imageBucket.openDownloadStream(fileId).pipe(res);
  } catch (error) {
    console.error('Error streaming image:', error);
    res.status(500).json({ error: 'Failed to stream image' });
  }
});

module.exports = router;
