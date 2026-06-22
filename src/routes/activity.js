const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

function enrichEntry(entry) {
  if (!entry) return null;
  const task = db.get('SELECT id, name FROM tasks WHERE id = ?', [entry.task_id]);
  const linkedTask = entry.linked_task_id
    ? db.get('SELECT id, name FROM tasks WHERE id = ?', [entry.linked_task_id])
    : null;
  return { ...entry, task_name: task?.name, linked_task_name: linkedTask?.name };
}

// GET all activity
router.get('/', (req, res) => {
  try {
    const { taskId } = req.query;
    let sql, params;

    if (taskId) {
      sql = `SELECT * FROM activity_log WHERE task_id = ? OR linked_task_id = ? ORDER BY date DESC, created_at DESC`;
      params = [taskId, taskId];
    } else {
      sql = `SELECT * FROM activity_log ORDER BY date DESC, created_at DESC`;
      params = [];
    }

    const entries = db.all(sql, params);
    res.json(entries.map(enrichEntry));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one entry
router.get('/:id', (req, res) => {
  try {
    const entry = db.get('SELECT * FROM activity_log WHERE id = ?', [req.params.id]);
    if (!entry) return res.status(404).json({ error: 'Activity entry not found' });
    res.json(enrichEntry(entry));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create entry
router.post('/', (req, res) => {
  try {
    const { taskId, linkedTaskId, date, notes } = req.body;

    if (!taskId) return res.status(400).json({ error: 'taskId is required' });
    if (!date) return res.status(400).json({ error: 'date is required' });

    const task = db.get('SELECT id FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(400).json({ error: 'Task not found' });

    if (linkedTaskId) {
      const linkedTask = db.get('SELECT id FROM tasks WHERE id = ?', [linkedTaskId]);
      if (!linkedTask) return res.status(400).json({ error: 'Linked task not found' });
      if (linkedTaskId === taskId) return res.status(400).json({ error: 'Linked task must differ from primary task' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO activity_log (id, task_id, linked_task_id, date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, taskId, linkedTaskId || null, date, notes || null, now, now]
    );

    const entry = db.get('SELECT * FROM activity_log WHERE id = ?', [id]);
    res.status(201).json(enrichEntry(entry));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update entry
router.put('/:id', (req, res) => {
  try {
    const { taskId, linkedTaskId, date, notes } = req.body;

    if (!taskId) return res.status(400).json({ error: 'taskId is required' });
    if (!date) return res.status(400).json({ error: 'date is required' });

    const entry = db.get('SELECT * FROM activity_log WHERE id = ?', [req.params.id]);
    if (!entry) return res.status(404).json({ error: 'Activity entry not found' });

    const task = db.get('SELECT id FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(400).json({ error: 'Task not found' });

    if (linkedTaskId) {
      const linkedTask = db.get('SELECT id FROM tasks WHERE id = ?', [linkedTaskId]);
      if (!linkedTask) return res.status(400).json({ error: 'Linked task not found' });
      if (linkedTaskId === taskId) return res.status(400).json({ error: 'Linked task must differ from primary task' });
    }

    const now = new Date().toISOString();
    db.run(
      'UPDATE activity_log SET task_id = ?, linked_task_id = ?, date = ?, notes = ?, updated_at = ? WHERE id = ?',
      [taskId, linkedTaskId || null, date, notes || null, now, req.params.id]
    );

    const updated = db.get('SELECT * FROM activity_log WHERE id = ?', [req.params.id]);
    res.status(200).json(enrichEntry(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE entry
router.delete('/:id', (req, res) => {
  try {
    const entry = db.get('SELECT * FROM activity_log WHERE id = ?', [req.params.id]);
    if (!entry) return res.status(404).json({ error: 'Activity entry not found' });

    db.run('DELETE FROM activity_log WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
