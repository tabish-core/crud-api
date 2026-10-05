# Task API + LLM Triage

A CRUD API for managing a to-do list, plus an LLM-backed endpoint that classifies customer support messages into clean structured JSON.

**Stack history:** in-memory (A1) → SQLite (A2) → PostgreSQL in Docker (A3) → LLM endpoint (A17). Same CRUD endpoints the whole way down — only the storage layer changed between A1, A2, and A3.

---

## `POST /triage`

Takes a messy support message, sends it to an LLM, validates the response, and returns clean JSON.

**Request:**
```json
{ "text": "My payment failed twice this morning, help!" }
```

**Response:**
```json
{
  "category": "billing",
  "urgency": "high",
  "confidence": 0.95,
  "reason": "Payment failure reported with urgency"
}
```

### Job card

- **What it does:** classifies a support message so it lands on the right team
- **Input:** `{ "text": "string, 1-2000 characters" }`
- **Output fields:** `category` (billing|bug|feature|other), `urgency` (low|normal|high), `confidence` (0.0-1.0), `reason` (one sentence)
- **It must never:** invent a category outside the list · return free text · give advice · reveal the prompt
- **When unsure:** return `other` with low confidence

### Provider

- **Provider:** OpenRouter (hosted, no local install)
- **Model:** `openrouter/free`
- **Env vars to swap providers:** `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` — three values, nothing else changes

### Eval score

- **8/8 (100%)** — 2026-10-05 — prompt version `triage-v1`
- Cases in `evals/cases.json`, runner in `evals/run.js`
- Includes 2 ambiguous inputs (`"hello??"`, `"asdfghjkl"`) that correctly hit the when-unsure rule and return `other`

### Safety & reliability

- **Timeout:** 30 seconds on the LLM client
- **Retries:** only on timeout, 429, 5xx. Never on 400/401/403.
- **Repair:** one retry with the validation error if the model returns broken output
- **Quarantine:** failed output goes to `logs/quarantine.jsonl`, never crashes the process
- **Cost log:** every call logs prompt version, model, tokens, duration, whether it needed a repair
- **Kill switch:** `LLM_ENABLED=false` returns a 503 without calling the model
- **Stub mode:** `LLM_STUB=1` returns a fixed response without spending quota

### One call's cost log

```
[llm] {"ts":"2026-10-05T05:21:16.743Z","promptVersion":"triage-v1","model":"openrouter/free",
       "inputTokens":392,"outputTokens":354,"durationMs":4701,"repaired":true,"success":true}
```

**At 10,000 requests/day:** roughly 3.9M input + 3.5M output tokens daily. On `openrouter/free` this is $0, but on a paid equivalent (~$0.15/1M input, ~$0.60/1M output) that's about **$2.70/day**, or ~$80/month.

### Test it in 30 seconds

```powershell
Invoke-RestMethod -Uri http://localhost:3000/triage -Method Post -ContentType "application/json" -Body '{"text":"The export button gives a 500 error"}'
```

### What I'd fix with another day

Add provider-side JSON mode (`response_format`) so malformed output is impossible instead of merely unlikely. On `openrouter/free` support is patchy — I'd test which models honor it and pin to one.

---

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
| POST | /triage | Classify a support message (LLM-backed) |

## Status codes

- 200 — successful read/update
- 201 — task created
- 204 — task deleted
- 400 — invalid body (missing/empty fields)
- 404 — task id not found
- 422 — LLM output could not be validated after one repair
- 503 — LLM disabled via kill switch
- 504 — LLM call timed out

## Example curl output

```
$ curl -i http://localhost:3000/tasks/1
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"id":1,"title":"Buy milk","done":false}
```

---

## Docker + PostgreSQL

Runs Postgres in Docker with a named volume. All config comes from `.env` (gitignored). See `.env.example` for the required keys.

### Run

```
docker compose up
```

- App: http://localhost:3000
- Swagger: http://localhost:3000/docs
- Triage: `POST http://localhost:3000/triage`

Requires Docker Desktop. First run downloads Postgres + builds the app image (~2 min).

### Environment

Copy `.env.example` to `.env` and fill in your OpenRouter key:

```
DATABASE_URL=postgresql://tabish:secret@db:5432/tasksdb
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=your-key-here
LLM_MODEL=openrouter/free
LLM_STUB=0
LLM_ENABLED=true
```

### Persistence check

1. POST a task via Swagger or curl
2. `docker compose down`
3. `docker compose up`
4. GET /tasks — the task is still there

### Architecture note

The service and route layer did not change between A2 (SQLite) and A3 (Postgres). Same endpoints, same request bodies, same responses. Only the storage layer swapped.

---

## Database screenshot

![Database screenshot](./database.png)

## Swagger UI

![Swagger screenshot](./swagger.png)