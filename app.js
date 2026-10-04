require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.json());

async function setup() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN DEFAULT false
    )
  `);
  const { rows } = await pool.query('SELECT COUNT(*) FROM tasks');
  if (parseInt(rows[0].count) === 0) {
    await pool.query(`INSERT INTO tasks (title, done) VALUES 
      ('Buy milk', false), ('Walk dog', true), ('Write code', false)`);
  }
}

app.get('/', (req, res) => {
  res.json({ name: 'Task API', version: '1.0', endpoints: ['/tasks'] });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/tasks', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks ORDER BY id');
  res.json(rows);
});

app.get('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: `Task ${id} not found` });
  res.json(rows[0]);
});

app.post('/tasks', async (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }
  const { rows } = await pool.query(
    'INSERT INTO tasks (title, done) VALUES ($1, false) RETURNING *',
    [title.trim()]
  );
  res.status(201).json(rows[0]);
});

app.put('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, done } = req.body;
  if (title === undefined && done === undefined) {
    return res.status(400).json({ error: 'Provide title and/or done' });
  }
  const check = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (check.rows.length === 0) return res.status(404).json({ error: `Task ${id} not found` });
  
  const current = check.rows[0];
  const newTitle = title !== undefined ? title : current.title;
  const newDone = done !== undefined ? done : current.done;
  
  const { rows } = await pool.query(
    'UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *',
    [newTitle, newDone, id]
  );
  res.json(rows[0]);
});

app.delete('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  if (result.rowCount === 0) return res.status(404).json({ error: `Task ${id} not found` });
  res.status(204).send();
});

const openapi = {
  openapi: '3.0.0',
  info: { title: 'Task API', version: '1.0' },
  paths: {
    '/tasks': {
      get: { summary: 'List all tasks', responses: { 200: { description: 'OK' } } },
      post: { summary: 'Create a task', responses: { 201: { description: 'Created' }, 400: { description: 'Bad Request' } } }
    },
    '/tasks/{id}': {
      get: { summary: 'Get one task', responses: { 200: { description: 'OK' }, 404: { description: 'Not Found' } } },
      put: { summary: 'Update a task', responses: { 200: { description: 'OK' }, 400: { description: 'Bad Request' }, 404: { description: 'Not Found' } } },
      delete: { summary: 'Delete a task', responses: { 204: { description: 'No Content' }, 404: { description: 'Not Found' } } }
    }
  }
};

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

setup().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});