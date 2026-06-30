const express = require('express');
const router = express.Router();
const db = require('../database/database');
const auth = require('../middleware/auth');

// Apply auth middleware to all notes routes
router.use(auth);

// GET /api/notes - list all user notes
router.get('/', async (req, res) => {
  const { category, search } = req.query;
  let sql = 'SELECT * FROM notes WHERE user_id = ?';
  const params = [req.session.userId];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    sql += ' AND (title LIKE ? OR content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY updated_at DESC';

  try {
    const notes = await db.all(sql, params);
    res.json({ success: true, notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to retrieve notes' });
  }
});

// GET /api/notes/categories - distinct categories
router.get('/categories', async (req, res) => {
  try {
    const rows = await db.all('SELECT DISTINCT category FROM notes WHERE user_id = ? ORDER BY category ASC', [req.session.userId]);
    const categories = rows.map(r => r.category || 'General');
    // Ensure "General" is always there
    if (!categories.includes('General')) {
      categories.unshift('General');
    }
    res.json({ success: true, categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to retrieve categories' });
  }
});

// POST /api/notes - create note
router.post('/', async (req, res) => {
  const { title, content, category } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  const cat = category && category.trim() !== '' ? category.trim() : 'General';

  try {
    const result = await db.run(
      'INSERT INTO notes (user_id, title, content, category) VALUES (?, ?, ?, ?)',
      [req.session.userId, title.trim(), content, cat]
    );
    const note = await db.get('SELECT * FROM notes WHERE id = ?', [result.id]);
    res.status(201).json({ success: true, note });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create note' });
  }
});

// PUT /api/notes/:id - edit note
router.put('/:id', async (req, res) => {
  const { title, content, category } = req.body;
  const { id } = req.params;

  if (!title || title.trim() === '') {
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  const cat = category && category.trim() !== '' ? category.trim() : 'General';

  try {
    // Check ownership
    const note = await db.get('SELECT * FROM notes WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    await db.run(
      'UPDATE notes SET title = ?, content = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title.trim(), content, cat, id]
    );

    const updatedNote = await db.get('SELECT * FROM notes WHERE id = ?', [id]);
    res.json({ success: true, note: updatedNote });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update note' });
  }
});

// DELETE /api/notes/:id - delete note
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const note = await db.get('SELECT * FROM notes WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    await db.run('DELETE FROM notes WHERE id = ?', [id]);
    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete note' });
  }
});

// GET /api/notes/export - export user notes
router.get('/export', async (req, res) => {
  try {
    const notes = await db.all('SELECT title, content, category, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY category, created_at', [req.session.userId]);
    
    // Format notes as markdown content or JSON
    const exportData = {
      username: req.session.username,
      exportedAt: new Date().toISOString(),
      notesCount: notes.length,
      notes: notes
    };

    res.setHeader('Content-disposition', 'attachment; filename=ragnar_notes_backup.json');
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to export notes' });
  }
});

module.exports = router;
