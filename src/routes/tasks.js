const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// Helper: enrich task with categories
function enrichTask(task) {
  if (!task) return null;
  const categories = db.all(
    `SELECT c.* FROM categories c
     JOIN task_categories tc ON c.id = tc.category_id
     WHERE tc.task_id = ?
     ORDER BY c.name ASC`,
    [task.id]
  );
  return { ...task, categories, completed: !!task.completed };
}

// GET all tasks
router.get('/', (req, res) => {
  try {
    const { completed, category } = req.query;
    let sql = 'SELECT DISTINCT t.* FROM tasks t';
    const params = [];

    if (category) {
      sql += ' JOIN task_categories tc ON t.id = tc.task_id WHERE tc.category_id = ?';
      params.push(category);
      if (completed !== undefined) {
        sql += ' AND t.completed = ?';
        params.push(completed === 'true' ? 1 : 0);
      }
    } else if (completed !== undefined) {
      sql += ' WHERE t.completed = ?';
      params.push(completed === 'true' ? 1 : 0);
    }

    sql += ' ORDER BY t.created_at DESC';

    const tasks = db.all(sql, params);
    res.json(tasks.map(enrichTask));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one task
router.get('/:id', (req, res) => {
  try {
    const task = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(enrichTask(task));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET activity for a task
router.get('/:id/activity', (req, res) => {
  try {
    const task = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const entries = db.all(
      `SELECT a.*,
        t1.name AS task_name,
        t2.name AS linked_task_name
       FROM activity_log a
       JOIN tasks t1 ON a.task_id = t1.id
       LEFT JOIN tasks t2 ON a.linked_task_id = t2.id
       WHERE a.task_id = ? OR a.linked_task_id = ?
       ORDER BY a.date DESC, a.created_at DESC`,
      [req.params.id, req.params.id]
    );
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create task
router.post('/', (req, res) => {
  try {
    const { name, description, categoryIds } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO tasks (id, name, description, completed, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
      [id, name.trim(), description || null, now, now]
    );

    if (Array.isArray(categoryIds)) {
      for (const catId of categoryIds) {
        const cat = db.get('SELECT id FROM categories WHERE id = ?', [catId]);
        if (cat) {
          db.run('INSERT OR IGNORE INTO task_categories (task_id, category_id) VALUES (?, ?)', [id, catId]);
        }
      }
    }

    const task = db.get('SELECT * FROM tasks WHERE id = ?', [id]);
    res.status(201).json(enrichTask(task));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update task
router.put('/:id', (req, res) => {
  try {
    const { name, description, categoryIds } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    const task = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const now = new Date().toISOString();
    db.run(
      'UPDATE tasks SET name = ?, description = ?, updated_at = ? WHERE id = ?',
      [name.trim(), description || null, now, req.params.id]
    );

    // Rebuild categories
    db.run('DELETE FROM task_categories WHERE task_id = ?', [req.params.id]);
    if (Array.isArray(categoryIds)) {
      for (const catId of categoryIds) {
        const cat = db.get('SELECT id FROM categories WHERE id = ?', [catId]);
        if (cat) {
          db.run('INSERT OR IGNORE INTO task_categories (task_id, category_id) VALUES (?, ?)', [req.params.id, catId]);
        }
      }
    }

    const updated = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json(enrichTask(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH toggle complete
router.patch('/:id/complete', (req, res) => {
  try {
    const task = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const now = new Date().toISOString();
    const newCompleted = task.completed ? 0 : 1;
    const completedAt = newCompleted ? now : null;

    db.run(
      'UPDATE tasks SET completed = ?, completed_at = ?, updated_at = ? WHERE id = ?',
      [newCompleted, completedAt, now, req.params.id]
    );

    const updated = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json(enrichTask(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE task
router.delete('/:id', (req, res) => {
  try {
    const task = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    db.run('DELETE FROM task_categories WHERE task_id = ?', [req.params.id]);
    db.run('DELETE FROM activity_log WHERE task_id = ? OR linked_task_id = ?', [req.params.id, req.params.id]);
    db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
