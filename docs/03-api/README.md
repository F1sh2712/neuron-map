# API Documentation

This document records the current and planned API contract for the Phase 1 MVP.

## POST /api/auth/profile

Purpose: save or update the current user's profile after signup.

Auth: required.

Request body:

```json
{
  "username": "Alice",
  "bio": "COMP9021 student"
}
```

Success response:

```json
{
  "success": true
}
```

Errors:

- `401` unauthorized.

Current status: implemented.

## POST /api/documents

Purpose: create document metadata after a file upload.

Auth: required.

Request body:

```json
{
  "title": "Week 1 Notes",
  "fileUrl": "https://..."
}
```

Success response:

```json
{
  "id": "document_id"
}
```

Errors:

- `400` missing `title` or `fileUrl`.
- `401` unauthorized.

Current status: implemented, but should be tightened so `fileUrl` belongs to the current user's storage path.

## POST /api/documents/[id]/extract

Purpose: extract knowledge nodes and edges for one document.

Auth: required. The document must belong to the current user.

Success response:

```json
{
  "status": "COMPLETED",
  "nodeCount": 8,
  "edgeCount": 5,
  "nodes": [
    {
      "title": "Recursion",
      "level": "star",
      "summary": "A technique where a function solves a problem by calling itself on smaller inputs."
    }
  ]
}
```

Errors:

- `401` unauthorized.
- `404` document not found.
- `500` extraction failed.

Current status: implemented as a PDF prototype. Needs to become Markdown-first and use `COMPLETED` instead of `DONE`.

## Planned APIs

### GET /api/documents

Purpose: list current user's documents.

### GET /api/documents/[id]

Purpose: return one document with its nodes and edges.

### GET /api/documents/[id]/status

Purpose: return processing status and progress.

Example response:

```json
{
  "id": "document_id",
  "status": "PROCESSING",
  "extractProgress": 60
}
```
