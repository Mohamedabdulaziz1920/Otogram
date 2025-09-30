const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // ✅ رابط تشغيل الفيديو (Stream endpoint)
  videoUrl: {
    type: String,
    required: true
  },
  // ✅ حفظ الـ GridFS File ID (مهم لإدارة الفيديوهات داخل MongoDB)
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  thumbnail: {
    type: String
  },
  description: {
    type: String,
    maxlength: 500
  },
  isReply: {
    type: Boolean,
    default: false
  },
  parentVideo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    default: null
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Video', videoSchema);
