# SQL / MySQL implementation notes

This project is currently a **static UI** (`site/public/`) plus a **ready-to-plug-in MySQL data layer** (`server/`).  
The API layer is intentionally deferred, but the database design and tooling are set up in a production-friendly way.

## Where SQL lives

- Schema + tables: `server/migrations/001_init.sql`
- Migration runner: `server/src/db/migrate.ts`
- Connection pool: `server/src/db/pool.ts`
- Env config loader: `server/src/db/config.ts`
- Seed data script: `server/src/scripts/seed.ts`

## Schema strategy (migrations)

Instead of manually editing a “final schema”, all changes are **versioned** as ordered `.sql` files:

- Files live in `server/migrations/`
- They are applied in filename order (lexicographic sort)

The migration runner creates and uses a simple tracking table:

- `schema_migrations(id, applied_at)`

Each migration file name is recorded as the `id`, ensuring migrations are **idempotent** (only applied once per DB).

## Tables (what they represent)

The initial schema mirrors the UI concepts:

- `users`
  - Stores identity (name/email). No password/session fields yet (auth comes later).
- `user_settings`
  - Stores preferences like currency, monthly goal, and toggles.
- `transactions`
  - Stores both income and expenses using `type ENUM('income','expense')`.
  - Indexed by `(user_id, occurred_at)` for time-based queries.
- `goals`
  - Stores a goal per user (target vs saved).

All tables use:

- `ENGINE=InnoDB`
- `utf8mb4` charset + `utf8mb4_0900_ai_ci` collation
- Foreign keys with `ON DELETE CASCADE` so deleting a user removes dependent rows.

## Connection management (pooling)

MySQL connections are managed with `mysql2/promise` pooling:

- `server/src/db/pool.ts`
  - `connectionLimit: 10`
  - `namedPlaceholders: true` (prepared statement friendliness)
  - `decimalNumbers: true` (DECIMAL comes back as JS numbers)
  - `charset: 'utf8mb4'`

This is the typical “production default” approach vs creating a new connection per query.

## Configuration (env vars)

The tooling reads MySQL connection details from env vars:

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

Example file:

- `server/.env.example`

The `requiredEnv(...)` helper in `server/src/db/config.ts` validates presence and provides safe defaults for local usage.

## Seeding (optional demo data)

`server/src/scripts/seed.ts` creates a single demo user and inserts:

- a few `transactions`
- a couple `goals`
- a `user_settings` row

Seed is safe to re-run because it checks existing row counts before inserting.

Seeding is disabled by default; to run it:

- `FINANCEFLOW_ALLOW_SEED=1 npm run db:seed`

## How to run (no Docker)

1. Create DB + user (edit password first):
   - `config/mysql/native_bootstrap.sql`
2. Configure env:
   - `cp server/.env.example server/.env`
3. Apply migrations + seed:
   - `cd server && npm install`
   - `npm run db:migrate`
   - (Optional) `FINANCEFLOW_ALLOW_SEED=1 npm run db:seed`

Full guide:

- `docs/MYSQL_SETUP.md`

## What’s intentionally missing (until API is added)

- Query layer / repositories consumed by the UI
- Server-side validation at HTTP boundaries
- Authentication/session tables
- Multi-tenant controls and authorization rules

Those will be introduced when the API/auth phase begins; the schema and migration workflow are ready for that.
