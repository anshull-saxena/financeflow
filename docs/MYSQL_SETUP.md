# MySQL setup (no Docker)

This project includes MySQL schema + migration tooling under `server/`, but **does not** ship an API layer yet.

## 1) Install MySQL locally

Pick one:

- macOS (Homebrew): install MySQL and start the service with Homebrew Services.
- Linux: install `mysql-server` via your distro package manager and start it with `systemctl`.
- Windows: install MySQL Server via the official installer and ensure the MySQL service is running.

## 2) Create database + user

Edit the placeholder password in `config/mysql/native_bootstrap.sql`, then run it as an admin user:

- `mysql -u root -p < config/mysql/native_bootstrap.sql`

If you prefer a remote DB host, create the user with the appropriate host pattern (e.g. `'financeflow'@'%'`) and restrict it with firewall/VPC rules.

## 3) Configure env vars for the tooling

Copy:

- `cp server/.env.example server/.env`

Update `server/.env` to match your MySQL host/port/user/password.

## 4) Run migrations + seed

From `server/`:

- `npm install`
- `npm run db:migrate`
- (Optional) `FINANCEFLOW_ALLOW_SEED=1 npm run db:seed`

## One-command setup (recommended)

If you’re on macOS/Linux (or Windows via WSL/Git Bash), you can run:

- `bash scripts/setup.sh`

This installs `server/` deps, helps you create `server/.env`, optionally bootstraps DB/user (requires `mysql` client + admin access), then runs migrations and seeding.

## Notes (production)

- Use a least-privilege DB user (don’t use `root` for the app).
- Backups: enable automated snapshots/point-in-time recovery in your managed MySQL (RDS/Cloud SQL/etc.).
- TLS: require TLS connections for non-local DB hosts.
