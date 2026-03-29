-- Bootstrap FinanceFlow MySQL database/users WITHOUT Docker.
-- 1) Review and change the password(s) below.
-- 2) Run as a MySQL admin user (root / DBA).

CREATE DATABASE IF NOT EXISTS financeflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

-- Local-only app user (recommended for dev)
CREATE USER IF NOT EXISTS 'financeflow'@'localhost' IDENTIFIED BY 'change-me';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON financeflow.* TO 'financeflow'@'localhost';

FLUSH PRIVILEGES;

