# TaskPicker

A local task manager with a random task picker, category management, and activity logging.

## Quick Start

```bash
npm install
npm start
```

Then open **http://localhost:3000**

## Requirements

- Node.js 18+
- On most systems `npm install` works out of the box.
- If `better-sqlite3` fails to build (native addon), the app uses `sql.js` (pure JS SQLite) as a fallback — no action needed.

## Features

- **Pick page** — Select a category, click "Pick a Random Task" to get a random active task
- **Tasks** — Full CRUD, multi-category assignment, complete/reopen toggle
- **Categories** — Full CRUD
- **Activity Log** — Log work sessions against tasks with a date, notes, and an optional linked task; view globally or per-task

## Data

The SQLite database is stored at `data/taskpicker.db` and is created automatically on first run.

## Migrating to better-sqlite3 (optional, faster)

If you want the native `better-sqlite3` instead of `sql.js`, edit `src/db.js`:

```js
// Replace the sql.js import block with:
const Database = require('better-sqlite3');
const db = new Database(DB_PATH);
```

And update `package.json` dependencies accordingly.
