# photos-app

Fastify photo app with local file storage and SQLite metadata.

## What this includes

- Fastify backend with upload/list/stream photo endpoints.
- Local filesystem photo storage under `storage/local`.
- SQLite metadata store with transactional bulk inserts.

## Run locally

```bash
nvm use
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

### Core

- `PORT` (default: `3000`)
- `HOST` (default: `0.0.0.0`)
- `MAX_UPLOAD_SIZE_MB` (default: `20`)
- `LOCAL_UPLOAD_DIR` (default: `./storage/local`)

### SQLite connection

- `SQLITE_PATH` (default: `./data/photos.db`)
- `SQLITE_JOURNAL_MODE` (default: `WAL`)
- `SQLITE_BUSY_TIMEOUT_MS` (default: `5000`)

This keeps DB connection configuration separate from file storage settings.

## Bulk upload API

Use the same multipart field name `photo` multiple times in one request.

```bash
curl -X POST http://localhost:3000/api/photos/upload \
  -F "photo=@/path/to/img-1.jpg" \
  -F "photo=@/path/to/img-2.png"
```

Each saved file gets a matching SQLite row in one DB transaction.

## API overview

- `GET /health`
- `GET /api/providers`
- `GET /api/photos`
- `POST /api/photos/upload` (multipart: one or many `photo` fields)
- `GET /api/photos/:id/content`
