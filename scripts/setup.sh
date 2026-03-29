#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
info() { printf "%s\n" "$*"; }
warn() { printf "WARN: %s\n" "$*" >&2; }
die() { printf "ERROR: %s\n" "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

semver_ge() {
  # returns 0 if $1 >= $2 (both like: 18.0.0)
  local IFS=.
  local -a a b
  read -r -a a <<<"${1#v}"
  read -r -a b <<<"${2#v}"
  for i in 0 1 2; do
    local ai="${a[i]:-0}"
    local bi="${b[i]:-0}"
    if ((ai > bi)); then return 0; fi
    if ((ai < bi)); then return 1; fi
  done
  return 0
}

upsert_env() {
  local file="$1" key="$2" value="$3"
  if [[ ! -f "$file" ]]; then
    printf "%s=%s\n" "$key" "$value" >"$file"
    return
  fi
  if grep -qE "^${key}=" "$file"; then
    # macOS/BSD sed compatibility
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file" && rm -f "${file}.bak"
  else
    printf "\n%s=%s\n" "$key" "$value" >>"$file"
  fi
}

prompt_default() {
  local prompt="$1" default="$2" out_var="$3"
  local val
  read -r -p "${prompt} [${default}]: " val || true
  if [[ -z "${val}" ]]; then val="$default"; fi
  printf -v "$out_var" "%s" "$val"
}

prompt_secret() {
  local prompt="$1" default="$2" out_var="$3"
  local val
  read -r -s -p "${prompt} [${default}]: " val || true
  printf "\n"
  if [[ -z "${val}" ]]; then val="$default"; fi
  printf -v "$out_var" "%s" "$val"
}

bold "FinanceFlow local setup (no Docker)"
info "Repo: $ROOT_DIR"
info ""

need_cmd node
need_cmd npm

NODE_VERSION="$(node --version)"
if ! semver_ge "$NODE_VERSION" "18.0.0"; then
  die "Node.js >= 18 is required (found $NODE_VERSION)"
fi

if [[ ! -f "server/package.json" ]]; then
  die "Expected server package at server/package.json"
fi

bold "1) Install server dependencies"
npm --prefix server install
info ""

bold "2) Configure MySQL connection (server/.env)"
ENV_FILE="server/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  cp "server/.env.example" "$ENV_FILE"
  info "Created $ENV_FILE from example."
else
  info "Found existing $ENV_FILE (will update values you provide)."
fi

MYSQL_HOST=""
MYSQL_PORT=""
MYSQL_DATABASE=""
MYSQL_USER=""
MYSQL_PASSWORD=""

prompt_default "MySQL host" "127.0.0.1" MYSQL_HOST
prompt_default "MySQL port" "3306" MYSQL_PORT
prompt_default "MySQL database" "financeflow" MYSQL_DATABASE
prompt_default "MySQL app user" "financeflow" MYSQL_USER
prompt_secret  "MySQL app password" "financeflow" MYSQL_PASSWORD

# We embed the password in SQL during the optional bootstrap step; keep it simple/safe.
if [[ "$MYSQL_PASSWORD" == *"'"* || "$MYSQL_PASSWORD" == *"\\"* || "$MYSQL_PASSWORD" == *$'\n'* ]]; then
  warn "Your password contains characters that are hard to safely embed in a one-shot SQL bootstrap."
  warn "Bootstrap step will be skipped; you can create the DB/user manually via docs/MYSQL_SETUP.md."
  SKIP_BOOTSTRAP_DUE_TO_PASSWORD="1"
else
  SKIP_BOOTSTRAP_DUE_TO_PASSWORD="0"
fi

upsert_env "$ENV_FILE" "MYSQL_HOST" "$MYSQL_HOST"
upsert_env "$ENV_FILE" "MYSQL_PORT" "$MYSQL_PORT"
upsert_env "$ENV_FILE" "MYSQL_DATABASE" "$MYSQL_DATABASE"
upsert_env "$ENV_FILE" "MYSQL_USER" "$MYSQL_USER"
upsert_env "$ENV_FILE" "MYSQL_PASSWORD" "$MYSQL_PASSWORD"

info "Updated $ENV_FILE"
info ""

bold "3) Bootstrap database + user (optional, requires mysql client + admin access)"
if command -v mysql >/dev/null 2>&1; then
  if [[ "$SKIP_BOOTSTRAP_DUE_TO_PASSWORD" == "1" ]]; then
    info "Skipped bootstrap."
  else
    read -r -p "Run DB bootstrap now (creates DB + grants)? [y/N]: " RUN_BOOTSTRAP || true
    if [[ "${RUN_BOOTSTRAP:-}" =~ ^[Yy]$ ]]; then
      ADMIN_USER=""
      prompt_default "MySQL admin user" "root" ADMIN_USER
      info "Running bootstrap as ${ADMIN_USER}..."
      if mysql -u "$ADMIN_USER" -h "$MYSQL_HOST" -P "$MYSQL_PORT" -e "SELECT 1" >/dev/null 2>&1; then
        MYSQL_ADMIN_AUTH=()
      else
        info "Admin login likely requires a password. You may be prompted now."
        MYSQL_ADMIN_AUTH=(-p)
      fi
      mysql -u "$ADMIN_USER" "${MYSQL_ADMIN_AUTH[@]}" -h "$MYSQL_HOST" -P "$MYSQL_PORT" <<SQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'127.0.0.1' IDENTIFIED BY '${MYSQL_PASSWORD}';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'127.0.0.1';

FLUSH PRIVILEGES;
SQL
    info "Bootstrap complete."
    else
      info "Skipped bootstrap."
    fi
  fi
else
  warn "mysql client not found. Install MySQL client/server, then run:"
  warn "  mysql -u root -p < config/mysql/native_bootstrap.sql"
fi
info ""

bold "4) Run migrations + seed"
if command -v python3 >/dev/null 2>&1; then
  if ! python3 - <<PY >/dev/null 2>&1
import socket, sys
host = ${MYSQL_HOST@Q}
port = int(${MYSQL_PORT@Q})
s = socket.socket()
s.settimeout(1.0)
try:
  s.connect((host, port))
except Exception:
  sys.exit(1)
finally:
  try: s.close()
  except Exception: pass
sys.exit(0)
PY
  then
    die "Can't reach MySQL at ${MYSQL_HOST}:${MYSQL_PORT}. Start MySQL (or update server/.env), then re-run. See docs/MYSQL_SETUP.md."
  fi
else
  warn "python3 not found; skipping MySQL reachability check."
fi
(
  cd server
  npm run db:migrate
)
info ""

bold "4b) Optional: seed demo data"
read -r -p "Seed demo data into MySQL? [y/N]: " RUN_SEED || true
if [[ "${RUN_SEED:-}" =~ ^[Yy]$ ]]; then
  (
    cd server
    FINANCEFLOW_ALLOW_SEED=1 npm run db:seed
  )
else
  info "Skipped seeding."
fi
info ""

bold "5) Run the UI locally"
info "Static UI lives in: site/public"
info "Serve it with any static server, for example:"
info "  npx serve site/public"
info ""
bold "Done."
