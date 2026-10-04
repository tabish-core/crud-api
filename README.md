# Task API

A CRUD API for managing a to-do list. Built with Node.js + Express.
Current storage: **PostgreSQL in Docker**.

## Stack history

- **A1** — in-memory array (data lost on restart)
- **A2** — SQLite file (`tasks.db`)
- **A3** — PostgreSQL in Docker with a volume *(current)*

Same endpoints the whole way down. Only the storage layer changed.

## Run everything with one command

```bash
docker compose up
```

App: http://localhost:3000 — Swagger UI: http://localhost:3000/docs

Requires Docker Desktop. First run downloads Postgres + builds the app image (~2 min).

## Environment

The connection string comes from `.env` (gitignored). Copy the example:

```bash
cp .env.example .env
```

`.env.example` contains:
```
DATABASE_URL=postgresql://tabish:secret@db:5432/tasksdb
```

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

## Example curl output

```
$ curl -i http://localhost:3000/tasks/1
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"id":1,"title":"Buy milk","done":false}
```

## Persistence check

1. POST a task
2. `docker compose down`
3. `docker compose up`
4. GET /tasks — the task is still there

## Database screenshot

![Database screenshot](./database.png)

## Swagger UI

![Swagger screenshot](./swagger.png)