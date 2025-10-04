const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const auth = require('../middleware/auth'); // استيراد الـ middleware المُحسّن

// --- Register a new user ---
// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    await user.save();
    
    // حذف كلمة المرور من الكائن الذي سنعيده
    const userResponse = user.toObject();
    delete userResponse.password;

    const token = jwt.sign(
      { userId: user._id, role: user.role }, // ✨ التأكد من استخدام userId هنا
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});


// --- Login a user ---
// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const userResponse = user.toObject();
    delete userResponse.password;

    const token = jwt.sign(
      { userId: user._id, role: user.role }, // ✨ التأكد من استخدام userId هنا
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Logged in successfully!',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});


// --- Get Logged-in User Data ---
// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  // ✨ أصبح هذا المسار أبسط وأسرع بكثير!
  // لا حاجة لاستدعاء قاعدة البيانات مرة أخرى، لأن 'auth' middleware قام بذلك بالفعل.
  // بيانات المستخدم موجودة في req.user.
  res.status(200).json({ user: req.user });
});


module.exports = router;
