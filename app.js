const express = require('express');
const swaggerUi = require('swagger-ui-express');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;
const db = new Database('tasks.db');

app.use(express.json());

// --- Create table if missing ---
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0
  )
`);

// --- Seed 3 tasks only if empty ---
const count = db.prepare('SELECT COUNT(*) AS c FROM tasks').get().c;
if (count === 0) {
  const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  insert.run('Buy milk', 0);
  insert.run('Walk dog', 1);
  insert.run('Write code', 0);
}

// --- Root + health ---
app.get('/', (req, res) => {
  res.json({ name: 'Task API', version: '1.0', endpoints: ['/tasks'] });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// --- Read ---
app.get('/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks').all();
  res.json(tasks.map(t => ({ ...t, done: !!t.done })));
});

app.get('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: `Task ${id} not found` });
  res.json({ ...task, done: !!task.done });
});

// --- Create ---
app.post('/tasks', (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
  }
  const info = db.prepare('INSERT INTO tasks (title, done) VALUES (?, 0)').run(title.trim());
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ ...task, done: !!task.done });
});

// --- Update ---
app.put('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: `Task ${id} not found` });

  const { title, done } = req.body;
  if (title === undefined && done === undefined) {
    return res.status(400).json({ error: 'Provide title and/or done' });
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title must be a non-empty string' });
    }
  }
  if (done !== undefined && typeof done !== 'boolean') {
    return res.status(400).json({ error: 'done must be true or false' });
  }

  const newTitle = title !== undefined ? title.trim() : task.title;
  const newDone = done !== undefined ? (done ? 1 : 0) : task.done;

  db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(newTitle, newDone, id);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json({ ...updated, done: !!updated.done });
});

// --- Delete ---
app.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: `Task ${id} not found` });
  res.status(204).send();
});

// --- Swagger ---
const openapi = {
  openapi: '3.0.0',
  info: { title: 'Task API', version: '1.0' },
  paths: {
    '/': { get: { summary: 'API info', responses: { 200: { description: 'OK' } } } },
    '/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/tasks': {
      get: { summary: 'List all tasks', responses: { 200: { description: 'OK' } } },
      post: {
        summary: 'Create a task',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] } } }
        },
        responses: { 201: { description: 'Created' }, 400: { description: 'Bad Request' } }
      }
    },
    '/tasks/{id}': {
      get: {
        summary: 'Get one task',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'OK' }, 404: { description: 'Not Found' } }
      },
      put: {
        summary: 'Update a task',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, done: { type: 'boolean' } } } } }
        },
        responses: { 200: { description: 'OK' }, 400: { description: 'Bad Request' }, 404: { description: 'Not Found' } }
      },
      delete: {
        summary: 'Delete a task',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 204: { description: 'No Content' }, 404: { description: 'Not Found' } }
      }
    }
  }
};

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));