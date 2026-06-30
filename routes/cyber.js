const express = require('express');
const router = express.Router();
const db = require('../database/database');
const auth = require('../middleware/auth');

// GET /api/cyber - list all cybersecurity topics, optionally filtered by category
router.get('/', async (req, res) => {
  const { category, search } = req.query;
  let sql = 'SELECT id, title, category, created_at FROM cyber';
  const params = [];

  const conditions = [];
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (search) {
    conditions.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY title ASC';

  try {
    const topics = await db.all(sql, params);
    res.json({ success: true, topics });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to retrieve cybersecurity topics' });
  }
});

// GET /api/cyber/:id - get specific cybersecurity topic details
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const topic = await db.get('SELECT * FROM cyber WHERE id = ?', [id]);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }
    res.json({ success: true, topic });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to retrieve topic details' });
  }
});

// POST /api/cyber - Create new cybersecurity topic (Protected)
router.post('/', auth, async (req, res) => {
  const { title, category, content } = req.body;
  if (!title || !category || !content) {
    return res.status(400).json({ success: false, message: 'Title, category, and content are required' });
  }

  try {
    const result = await db.run(
      'INSERT INTO cyber (title, category, content) VALUES (?, ?, ?)',
      [title.trim(), category.trim(), content.trim()]
    );
    const newTopic = await db.get('SELECT * FROM cyber WHERE id = ?', [result.id]);
    res.status(201).json({ success: true, topic: newTopic });
  } catch (err) {
    console.error(err);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, message: 'A topic with this title already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create topic' });
  }
});

// PUT /api/cyber/:id - Edit topic (Protected)
router.put('/:id', auth, async (req, res) => {
  const { title, category, content } = req.body;
  const { id } = req.params;

  if (!title || !category || !content) {
    return res.status(400).json({ success: false, message: 'Title, category, and content are required' });
  }

  try {
    const topic = await db.get('SELECT * FROM cyber WHERE id = ?', [id]);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    await db.run(
      'UPDATE cyber SET title = ?, category = ?, content = ? WHERE id = ?',
      [title.trim(), category.trim(), content.trim(), id]
    );

    const updated = await db.get('SELECT * FROM cyber WHERE id = ?', [id]);
    res.json({ success: true, topic: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update topic' });
  }
});

// DELETE /api/cyber/:id - Delete topic (Protected)
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const topic = await db.get('SELECT * FROM cyber WHERE id = ?', [id]);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    await db.run('DELETE FROM cyber WHERE id = ?', [id]);
    res.json({ success: true, message: 'Topic deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete topic' });
  }
});

module.exports = router;
