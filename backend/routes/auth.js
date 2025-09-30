const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// --- Register a new user ---
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please provide all required fields: username, email, password.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email or username already exists.' }); // 409 Conflict
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 12); // Using 12 salt rounds is more secure

    // 4. Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      // 'role' will default to 'user' as defined in the model
    });

    await user.save();

    // 5. Create JWT token (including user role)
    const token = jwt.sign(
      { userId: user._id, role: user.role }, // ✨ Include role in the token payload
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 6. Send response
    // The user object is automatically cleaned by the toJSON method in the model
    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: user // ✨ Send the full user object
    });

  } catch (error) {
    // Handle validation errors from Mongoose
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
    const { email, password } = req.body; // Recommend logging in with email for uniqueness

    // 1. Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    // 2. Find user by email
    const user = await User.findOne({ email }).select('+password'); // Explicitly include password
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. Please check your email and password.' });
    }

    // 3. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Please check your email and password.' });
    }

    // 4. Create JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role }, // ✨ Include role
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Send response
    res.status(200).json({
      message: 'Logged in successfully!',
      token,
      user: user // ✨ Send the full user object
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

module.exports = router;
