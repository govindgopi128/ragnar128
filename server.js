const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow dashboard.js inline loads if needed
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "/uploads/", "https://images.unsplash.com"], // allow images/uploads and potential external test images
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

// General Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Login Specific Rate Limiter (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 login requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' }
});
app.use('/api/auth/login', loginLimiter);

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'ragnar-valhalla-deepmind-secret-key-9982',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if running over HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 1 day session longevity
    }
  })
);

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
const fileUploadsDir = path.join(__dirname, 'uploads/files');
if (!fs.existsSync(fileUploadsDir)) {
  fs.mkdirSync(fileUploadsDir, { recursive: true });
}
const backupDir = path.join(__dirname, 'uploads/backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Serve profile uploads statically (protected access handled in API, but avatar public images served statically)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const filesRoutes = require('./routes/files');
const cyberRoutes = require('./routes/cyber');

app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/cyber', cyberRoutes);

// Database backup and recovery helper endpoint (Part of settings)
app.post('/api/backup', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const dbSrc = path.join(__dirname, 'database/database.db');
  const backupFile = `backup-${Date.now()}.db`;
  const dbDest = path.join(__dirname, 'uploads/backups', backupFile);

  try {
    fs.copyFileSync(dbSrc, dbDest);
    res.json({ success: true, message: 'Database backed up successfully!', file: `/uploads/backups/${backupFile}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Backup failed' });
  }
});

// Front-End Page Router / Route Guard
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.redirect('/login.html');
  }
});

app.get('/index.html', (req, res) => {
  if (req.session && req.session.userId) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.redirect('/login.html');
  }
});

app.get('/login.html', (req, res) => {
  if (req.session && req.session.userId) {
    res.redirect('/');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});

// Serve other static assets in public folder
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to login or redirect
app.get('*', (req, res) => {
  if (req.session && req.session.userId) {
    res.redirect('/');
  } else {
    res.redirect('/login.html');
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`RAGNAR Server is running on port ${PORT}`);
});
