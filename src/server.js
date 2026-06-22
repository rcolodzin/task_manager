const express = require('express');
const path = require('path');
const { getDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Initialize DB then start server
getDb().then(() => {
  const categoriesRouter = require('./routes/categories');
  const tasksRouter = require('./routes/tasks');
  const activityRouter = require('./routes/activity');

  app.use('/api/categories', categoriesRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/activity', activityRouter);

  // Catch-all: serve index.html for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`\n🎯 TaskPicker running at http://localhost:${PORT}\n`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
