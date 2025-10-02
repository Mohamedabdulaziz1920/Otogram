const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = ('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const auth = require('../middleware/auth'); // تأكد من أن مسار هذا الملف صحيح

// --- Register a new user ---
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please provide all required fields: username, email, password.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email or username already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: user
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Register Error:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});


// --- Login a user ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. Please check your email and password.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Please check your email and password.' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Logged in successfully!',
      token,
      user: user
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});


// --- Get Logged-in User Data ---
// هذا المسار يتحقق من التوكن ويعيد بيانات المستخدم
router.get('/me', auth, async (req, res) => {
  try {
    // req.userId يتم إرفاقه بواسطة auth middleware
    const user = await User.findById(req.userId).select('-password'); 
    
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    res.status(200).json({ user });
  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


module.exports = router;
