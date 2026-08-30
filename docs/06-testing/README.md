# Testing and Verification

Phase 1 requires reproducible verification evidence. Do not only write "tested".

## Required Commands

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Record command output under `evidence/logs/`.

## Manual Test Plan

### Auth Flow

1. Open `/register`.
2. Register with a test email.
3. Complete OTP verification.
4. Set a password and optional profile.
5. Confirm redirect to `/dashboard`.
6. Log out or open a private browser and confirm protected pages redirect to `/login`.

Expected result: user can complete signup and protected routes require auth.

### Markdown Upload Flow

Status: pending implementation.

1. Open `/upload`.
2. Upload a `.md` file under 5MB.
3. Confirm the file is stored in Supabase Storage.
4. Confirm a `Document` record is created.
5. Confirm extraction creates nodes and edges.
6. Confirm final status is `COMPLETED`.

Expected result: document, nodes, and edges exist and are visible in the app.

### Error Cases

Status: pending implementation.

- Upload a non-Markdown file.
- Upload a file larger than 5MB.
- Trigger extraction with a document owned by another user.
- Simulate AI extraction failure.

Expected result: app shows clear errors and does not leak data across users.

## Evidence Locations

- Logs: `evidence/logs/`
- Screenshots: `evidence/screenshots/`

Recommended screenshots:

- Login page.
- Dashboard after login.
- Upload page.
- Extraction result page.
