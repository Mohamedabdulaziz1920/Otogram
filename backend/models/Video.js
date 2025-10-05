const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'المستخدم مطلوب'],
    index: true
  },
  // ✅ رابط تشغيل الفيديو (Stream endpoint)
  videoUrl: {
    type: String,
    required: [true, 'رابط الفيديو مطلوب']
  },
  // ✅ حفظ الـ GridFS File ID (مهم لإدارة الفيديوهات داخل MongoDB)
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'معرف الملف مطلوب'],
    index: true
  },
  thumbnail: {
    type: String,
    default: ''
  },
  thumbnailFileId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  description: {
    type: String,
    maxlength: [500, 'الوصف يجب ألا يتجاوز 500 حرف'],
    default: ''
  },
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isReply: {
    type: Boolean,
    default: false,
    index: true
  },
  parentVideo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    default: null,
    index: true
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  saved: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  shares: {
    type: Number,
    default: 0,
    min: 0
  },
  // معلومات الفيديو
  duration: {
    type: Number, // بالثواني
    default: 0
  },
  fileSize: {
    type: Number, // بالبايت
    default: 0
  },
  mimeType: {
    type: String,
    default: 'video/mp4'
  },
  // حالة الفيديو
  isPublic: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // تتبع التقارير
  reportCount: {
    type: Number,
    default: 0
  },
  isReported: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ================== Indexes للأداء ==================

// Compound indexes
videoSchema.index({ user: 1, createdAt: -1 });
videoSchema.index({ user: 1, isReply: 1 });
videoSchema.index({ parentVideo: 1, createdAt: -1 });
videoSchema.index({ isReply: 1, createdAt: -1 });
videoSchema.index({ isPublic: 1, isActive: 1, createdAt: -1 });

// Text index للبحث
videoSchema.index({ description: 'text', hashtags: 'text' });

// Index للفيديوهات الشائعة
videoSchema.index({ views: -1, likes: -1 });

// ================== Virtual Fields ==================

// عدد الإعجابات
videoSchema.virtual('likesCount').get(function() {
  return this.likes?.length || 0;
});

// عدد الردود
videoSchema.virtual('repliesCount').get(function() {
  return this.replies?.length || 0;
});

// عدد المحفوظات
videoSchema.virtual('savedCount').get(function() {
  return this.saved?.length || 0;
});

// ================== Middleware (Hooks) ==================

// Pre-save: إضافة الفيديو لقائمة replies الخاصة بالفيديو الأب
videoSchema.pre('save', async function(next) {
  if (this.isNew && this.isReply && this.parentVideo) {
    try {
      await this.model('Video').findByIdAndUpdate(
        this.parentVideo,
        { $addToSet: { replies: this._id } }
      );
      console.log(`✅ Added reply ${this._id} to parent video ${this.parentVideo}`);
    } catch (error) {
      console.error('❌ Error adding reply to parent:', error);
    }
  }
  next();
});

// Pre-remove: تنظيف البيانات المرتبطة
videoSchema.pre('remove', async function(next) {
  try {
    // إزالة الفيديو من قائمة replies الخاصة بالفيديو الأب
    if (this.parentVideo) {
      await this.model('Video').findByIdAndUpdate(
        this.parentVideo,
        { $pull: { replies: this._id } }
      );
    }
    
    // حذف جميع الردود على هذا الفيديو
    if (this.replies && this.replies.length > 0) {
      await this.model('Video').deleteMany({ _id: { $in: this.replies } });
    }
    
    console.log(`✅ Cleaned up data for deleted video: ${this._id}`);
    next();
  } catch (error) {
    console.error('❌ Error in pre-remove hook:', error);
    next(error);
  }
});

// ================== Instance Methods ==================

// إضافة مشاهدة
videoSchema.methods.addView = async function() {
  this.views += 1;
  return await this.save({ validateBeforeSave: false });
};

// إضافة مشاركة
videoSchema.methods.addShare = async function() {
  this.shares += 1;
  return await this.save({ validateBeforeSave: false });
};

// تبديل الإعجاب
videoSchema.methods.toggleLike = async function(userId) {
  const index = this.likes.indexOf(userId);
  if (index > -1) {
    this.likes.splice(index, 1);
    await this.save();
    return { liked: false, likesCount: this.likes.length };
  } else {
    this.likes.push(userId);
    await this.save();
    return { liked: true, likesCount: this.likes.length };
  }
};

// تبديل الحفظ
videoSchema.methods.toggleSave = async function(userId) {
  const index = this.saved.indexOf(userId);
  if (index > -1) {
    this.saved.splice(index, 1);
    await this.save();
    return { saved: false };
  } else {
    this.saved.push(userId);
    await this.save();
    return { saved: true };
  }
};

// ================== Static Methods ==================

// جلب الفيديوهات العامة والنشطة
videoSchema.statics.findPublicVideos = function(options = {}) {
  return this.find({
    isPublic: true,
    isActive: true,
    isReply: false,
    ...options
  })
    .populate('user', 'username profileImage')
    .sort({ createdAt: -1 });
};

// جلب الفيديوهات الشائعة
videoSchema.statics.findTrendingVideos = function(limit = 20) {
  return this.find({
    isPublic: true,
    isActive: true,
    isReply: false
  })
    .populate('user', 'username profileImage')
    .sort({ views: -1, likes: -1 })
    .limit(limit);
};

// البحث في الفيديوهات
videoSchema.statics.searchVideos = function(query, limit = 20) {
  return this.find(
    { 
      $text: { $search: query },
      isPublic: true,
      isActive: true
    },
    { score: { $meta: 'textScore' } }
  )
    .populate('user', 'username profileImage')
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit);
};

// إحصائيات النظام
videoSchema.statics.getSystemStats = async function() {
  const [
    total,
    published,
    replies,
    totalViews,
    totalLikes
  ] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ isPublic: true, isActive: true, isReply: false }),
    this.countDocuments({ isReply: true }),
    this.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
    this.aggregate([{ $group: { _id: null, total: { $sum: { $size: '$likes' } } } }])
  ]);
  
  return {
    total,
    published,
    replies,
    totalViews: totalViews[0]?.total || 0,
    totalLikes: totalLikes[0]?.total || 0
  };
};

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;
