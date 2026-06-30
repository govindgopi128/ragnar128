const express = require('express');
const router = express.Router();
const db = require('../database/database');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');

// Setup avatar upload storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'avatar-' + req.session.userId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpg, jpeg, png, gif) are allowed'));
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Set user session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.profilePicture = user.profile_picture;

    res.json({ success: true, message: 'Logged in successfully', user: { username: user.username, profilePicture: user.profile_picture } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// GET /api/auth/session - check session status
router.get('/session', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      loggedIn: true,
      user: {
        id: req.session.userId,
        username: req.session.username,
        profilePicture: req.session.profilePicture || '/images/avatar.jpg'
      }
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// POST /api/auth/profile/username (Protected)
router.post('/profile/username', auth, async (req, res) => {
  const { username } = req.body;
  if (!username || username.trim() === '') {
    return res.status(400).json({ success: false, message: 'Username cannot be empty' });
  }

  try {
    // Check if username is taken
    const existing = await db.get('SELECT * FROM users WHERE username = ? AND id != ?', [username, req.session.userId]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    await db.run('UPDATE users SET username = ? WHERE id = ?', [username, req.session.userId]);
    req.session.username = username;
    res.json({ success: true, message: 'Username updated successfully', username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error updating username' });
  }
});

// POST /api/auth/profile/password (Protected)
router.post('/profile/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new password are required' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNew, req.session.userId]);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error updating password' });
  }
});

// POST /api/auth/profile/avatar (Protected)
router.post('/profile/avatar', auth, (req, res) => {
  upload.single('avatar')(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      await db.run('UPDATE users SET profile_picture = ? WHERE id = ?', [avatarUrl, req.session.userId]);
      req.session.profilePicture = avatarUrl;
      res.json({ success: true, message: 'Avatar updated successfully', profilePicture: avatarUrl });
    } catch (dbErr) {
      console.error(dbErr);
      res.status(500).json({ success: false, message: 'Database error saving avatar' });
    }
  });
});

module.exports = router;
