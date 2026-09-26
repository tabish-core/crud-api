# Task API

A small CRUD API for managing a to-do list, built with Node.js + Express.

## Install & run

```bash
npm install
node app.js
```

Server runs at http://localhost:3000 — Swagger UI at http://localhost:3000/docs

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | / | API info |
| GET | /health | Health check |
| GET | /tasks | List all tasks |
| GET | /tasks/:id | Get one task |
| POST | /tasks | Create a task |
| PUT | /tasks/:id | Update a task |
| DELETE | /tasks/:id | Delete a task |

## Status codes

- 200 — successful read/update
- 201 — task created
- 204 — task deleted
- 400 — invalid body
- 404 — task id not found

## Example: curl -i output

```
$ curl -i http://localhost:3000/tasks/1
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 45

{"id":1,"title":"Buy milk","done":false}
```

## Swagger UI

![Swagger screenshot](./swagger.png)

All endpoints visible at `/docs`, full CRUD cycle works via "Try it out".