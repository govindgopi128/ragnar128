const express = require('express');
const router = express.Router();
const db = require('../database/database');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Apply auth middleware to all file routes
router.use(auth);

// Setup file upload storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads/files');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'file-' + req.session.userId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Allowed extensions
    const filetypes = /pdf|zip|png|jpg|jpeg|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype) || file.mimetype === 'application/x-zip-compressed' || file.mimetype === 'application/zip';
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only PDFs, ZIPs, and Images (PNG, JPG, GIF) are allowed.'));
  }
});

// GET /api/files - List user files
router.get('/', async (req, res) => {
  try {
    const files = await db.all('SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC', [req.session.userId]);
    res.json({ success: true, files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to retrieve files' });
  }
});

// POST /api/files/upload - Upload file
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file selected' });
    }

    try {
      const { filename, originalname, path: filepath, mimetype, size } = req.file;

      const result = await db.run(
        'INSERT INTO files (user_id, filename, original_name, filepath, mimetype, size) VALUES (?, ?, ?, ?, ?, ?)',
        [req.session.userId, filename, originalname, filepath, mimetype, size]
      );

      const newFile = await db.get('SELECT * FROM files WHERE id = ?', [result.id]);
      res.status(201).json({ success: true, file: newFile });
    } catch (dbErr) {
      console.error(dbErr);
      // Clean up uploaded file if database insert fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ success: false, message: 'Database error saving file reference' });
    }
  });
});

// GET /api/files/download/:id - Download file
router.get('/download/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const file = await db.get('SELECT * FROM files WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    if (!fs.existsSync(file.filepath)) {
      return res.status(404).json({ success: false, message: 'Physical file not found on server' });
    }

    res.download(file.filepath, file.original_name);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to download file' });
  }
});

// DELETE /api/files/:id - Delete file
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const file = await db.get('SELECT * FROM files WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Delete file from storage
    if (fs.existsSync(file.filepath)) {
      fs.unlinkSync(file.filepath);
    }

    // Delete from DB
    await db.run('DELETE FROM files WHERE id = ?', [id]);
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
});

module.exports = router;
