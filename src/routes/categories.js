const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// GET all categories
router.get('/', (req, res) => {
  try {
    const categories = db.all('SELECT * FROM categories ORDER BY name ASC');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one category
router.get('/:id', (req, res) => {
  try {
    const cat = db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create category
router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    const existing = db.get('SELECT id FROM categories WHERE name = ?', [name.trim()]);
    if (existing) return res.status(409).json({ error: 'A category with that name already exists' });

    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO categories (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [id, name.trim(), now, now]
    );
    const cat = db.get('SELECT * FROM categories WHERE id = ?', [id]);
    res.status(201).json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update category
router.put('/:id', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    const cat = db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    const conflict = db.get('SELECT id FROM categories WHERE name = ? AND id != ?', [name.trim(), req.params.id]);
    if (conflict) return res.status(409).json({ error: 'A category with that name already exists' });

    const now = new Date().toISOString();
    db.run('UPDATE categories SET name = ?, updated_at = ? WHERE id = ?', [name.trim(), now, req.params.id]);
    const updated = db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE category
router.delete('/:id', (req, res) => {
  try {
    const cat = db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    db.run('DELETE FROM task_categories WHERE category_id = ?', [req.params.id]);
    db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
