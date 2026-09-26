// Stage 1: root and health endpoints
// Stage 2: read endpoints with 404
// Stage 3: create with validation
// Stage 4: full CRUD
// Stage 5: Swagger UI
// Stage 6: publish and docs

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const app = express();
const PORT = 3000;

app.use(express.json());

let tasks = [
  { id: 1, title: 'Buy milk', done: false },
  { id: 2, title: 'Walk dog', done: true },
  { id: 3, title: 'Write code', done: false }
];
let nextId = 4;

app.get('/', (req, res) => {
  res.json({ name: 'Task API', version: '1.0', endpoints: ['/tasks'] });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/tasks', (req, res) => {
  res.json(tasks);
});

app.get('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: `Task ${id} not found` });
  res.json(task);
});

app.post('/tasks', (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
  }
  const task = { id: nextId++, title: title.trim(), done: false };
  tasks.push(task);
  res.status(201).json(task);
});

app.put('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: `Task ${id} not found` });

  const { title, done } = req.body;
  if (title === undefined && done === undefined) {
    return res.status(400).json({ error: 'Provide title and/or done' });
  }
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title must be a non-empty string' });
    }
    task.title = title.trim();
  }
  if (done !== undefined) {
    if (typeof done !== 'boolean') {
      return res.status(400).json({ error: 'done must be true or false' });
    }
    task.done = done;
  }
  res.json(task);
});

app.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: `Task ${id} not found` });
  tasks.splice(idx, 1);
  res.status(204).send();
});

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