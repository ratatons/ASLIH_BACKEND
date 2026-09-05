# ASLIH Backend

Central backend for **ASLIH AGENT** (React Native/Expo) and **ASLIH ADMIN** (React/Vite). Node.js + TypeScript + Express + MongoDB + Socket.IO. This is the single source of truth — neither frontend talks to MongoDB directly.

## Stack

- Express + TypeScript, Mongoose (MongoDB, with 2dsphere geo indexes)
- JWT access + refresh tokens, Argon2 password hashing
- Zod request validation, Helmet, CORS allow-list, rate limiting
- Dynamic roles/permissions (RBAC), never hardcoded on the frontend
- Socket.IO real-time events (JWT-authenticated handshake)
- Multer file uploads, pluggable storage (local disk by default, S3-ready)
- Swagger UI at `/api/docs`
- Jest + Supertest + mongodb-memory-server tests

## Getting started

```bash
npm install
cp .env.example .env      # then edit MONGODB_URI, JWT secrets, CORS_ORIGINS
npm run dev                # ts-node-dev, auto-reload
```

On boot the server runs an **idempotent seed** (`src/seed.ts`) that creates:
- All permission keys listed in `src/constants/permissions.ts`
- A `SUPER_ADMIN` system role with every permission
- The default `AGENT` role (safe, non-privileged) used for public self-registration
- A handful of starter ticket types and teams (only if none exist yet)
- Optionally, a bootstrap super-admin account if `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` are set in the environment — use this to get your first admin login, then manage everyone else through `/api/users` and `/api/roles`.

## Scripts

- `npm run dev` — local development with auto-reload
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled server (used by Render)
- `npm test` — run the Jest/Supertest suite against an in-memory MongoDB
- `npm run seed` — run the seed script standalone (also runs automatically on server boot)

## Deploying to Render

`render.yaml` is included (Blueprint deploy). It runs `npm install && npm run build`, starts with `npm start`, and health-checks `GET /health`. Set `MONGODB_URI` (e.g. an Atlas connection string) and `CORS_ORIGINS` in the Render dashboard — everything else has sane defaults or auto-generates (JWT secrets).

> Render's default disk is ephemeral. `STORAGE_DRIVER=local` works for a quick demo, but uploaded photos will be lost on redeploy/restart. For production, add a Render persistent disk mounted at `UPLOAD_DIR`, or implement the S3 branch in `src/utils/storage.ts` (`STORAGE_DRIVER=s3`) and point it at any S3-compatible bucket.

## Architecture notes

- **No raw MongoDB ids ever reach clients.** `src/utils/serialize.ts` recursively converts every `_id` → `id` (string) and strips `__v` before any response is sent.
- **Authorization is enforced entirely server-side.** `requireAuth` populates the user's roles → permissions on every request; `requirePermission("KEY")` middleware guards every sensitive route independently. `401` = not authenticated, `403` = authenticated but not authorized.
- **The ticket status machine is one-directional** (`NEW → ASSIGNED → ON_MAINTENANCE → FIXED`) and enforced in the controllers — there is no generic `PATCH /issues/:id` that lets a client set `status` directly.
- **Ticket-type eligibility** (`TicketTypeUser` / `TicketTypeTeam`) is checked server-side on assignment (`src/controllers/issueType.controller.ts#isAgentEligibleForTicketType`); an ineligible agent is rejected with `403` even if the Admin UI is bypassed.
- **GPS proximity** for "start maintenance" is computed server-side via the Haversine formula against `ARRIVAL_RADIUS_METERS`; the client's `arrived` flag (if any) is never trusted.
- **Ticket codes** (`ASL-000001`, ...) are generated atomically via a Mongo counter document (`src/utils/ticketCode.ts`), safe under concurrent ticket creation.
- **Public registration** only ever accepts `fullName`, `email`, `phone`, `password` — `role`/`permissions`/`isAdmin`/etc. in the request body are ignored; every new account gets the seeded `AGENT` role. Admin/agent accounts are provisioned via `POST /api/users` + `PATCH /api/users/:id/role` by an already-authorized admin.

## Testing the full workflow

`tests/issue.test.ts` exercises the exact Agent A → Admin → Agent B → Fixed scenario end to end (report, assign with eligibility check, GPS-gated maintenance start, mandatory completion photo, fixed) against an in-memory MongoDB, plus a negative case for GPS proximity rejection. `tests/auth.test.ts` covers registration/login/authorization edge cases, including the privilege-escalation attempt via `role`/`isAdmin` in the register payload.

## Project layout

```
src/
  app.ts, server.ts        Express app wiring + entrypoint
  seed.ts                  idempotent startup seed
  config/                  env, logger, db connection
  models/                  Mongoose schemas (User, Role, Permission, Issue, ...)
  middleware/              auth (requireAuth/requirePermission), validate, upload, rateLimit, errorHandler
  validators/              Zod schemas per resource
  controllers/             route handlers / business logic
  routes/                  Express routers, mounted under /api in routes/index.ts
  sockets/                 Socket.IO server + auth + emit helpers
  utils/                   jwt, password hashing, serialize, geo, storage, audit, notify, ticketCode
  constants/permissions.ts seed-only permission catalog (not a frontend contract)
  docs/openapi.ts          OpenAPI document served at /api/docs
tests/                     Jest + Supertest + mongodb-memory-server
```
