const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

// @route  POST /api/auth/register
// @desc   Register a new user
// @access Public
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required')
      .matches(/^[a-zA-ZÀ-ɏ '.-]+$/).withMessage('Name can only contain letters and spaces'),
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email').isEmail().withMessage('Please enter a valid email').notEmpty().withMessage('Email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { name, username, email, password } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Username already taken' });
      }

      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      const user = await User.create({
        name,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password,
      });
      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: { _id: user._id, name: user.name, username: user.username, email: user.email },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route  POST /api/auth/login
// @desc   Login with username or email + password
// @access Public
router.post(
  '/login',
  [
    body('identifier').trim().notEmpty().withMessage('Username or email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { identifier, password } = req.body;
      const isEmail = identifier.includes('@');

      let user = null;

      if (isEmail) {
        // Try email field first
        user = await User.findOne({ email: identifier.toLowerCase() }).select('+password');
        // Fallback: email typed as username (dots/@ stripped during old registration)
        if (!user) {
          const stripped = identifier.toLowerCase().replace(/[^a-z0-9_]/g, '');
          user = await User.findOne({ username: stripped }).select('+password');
        }
      } else {
        // Try exact username
        user = await User.findOne({ username: identifier.toLowerCase() }).select('+password');
      }

      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (user.isBanned) {
        return res.status(403).json({ success: false, message: 'Your account has been suspended. Contact support.' });
      }

      const token = generateToken(user._id);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: { _id: user._id, name: user.name, username: user.username, email: user.email },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route  GET /api/auth/me
// @desc   Get current user
// @access Private
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// @route  PUT /api/auth/profile
// @desc   Update user profile (name and/or password)
// @access Private
router.put('/profile', protect, async (req, res, next) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const updates = {};
    if (name) updates.name = name;

    // Password change requested
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required' });
      }
      const userWithPwd = await User.findById(req.user._id).select('+password');
      const match = await userWithPwd.matchPassword(currentPassword);
      if (!match) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      }
      userWithPwd.password = newPassword;
      if (name) userWithPwd.name = name;
      await userWithPwd.save();
      const updated = await User.findById(req.user._id);
      return res.json({ success: true, user: updated });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
