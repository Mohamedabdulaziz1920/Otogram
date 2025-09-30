const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    // Regex بسيط للتحقق من صيغة الإيميل
    match: [/\S+@\S+\.\S+/, 'Please use a valid email address.']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  profileImage: {
    type: String,
    default: ''
  },
  // ✨ أضف هذا الحقل
  profileImageFileId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  role: {
    type: String,
    enum: {
      values: ['user', 'creator', 'admin'],
      message: '{VALUE} is not a supported role.'
    },
    default: 'user' // الدور الافتراضي لأي مستخدم جديد
  },

  likedVideos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
}, {
  // ✨ 2. إضافة timestamps تلقائيًا (createdAt, updatedAt)
  timestamps: true 
});

// ✨ 3. (اختياري ولكن موصى به) إخفاء كلمة المرور عند تحويل المستند إلى JSON
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
