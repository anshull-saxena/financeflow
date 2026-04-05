import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../migrations');

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const prev = sql[i - 1];

    if (char === "'" && !inDoubleQuote && !inBacktick && prev !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && !inBacktick && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === '`' && !inSingleQuote && !inDoubleQuote && prev !== '\\') {
      inBacktick = !inBacktick;
    }

    if (char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick) {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = '';
      continue;
    }

    current += char;
  }

  const finalStatement = current.trim();
  if (finalStatement) statements.push(finalStatement);

  return statements;
}

async function readMigrations() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();

  const migrations = [];
  for (const filename of files) {
    const fullPath = path.join(migrationsDir, filename);
    const sql = await fs.readFile(fullPath, 'utf8');
    migrations.push({ id: filename, filename, sql });
  }
  return migrations;
}

let schemaReady = false;
let schemaInitPromise = null;

export async function ensureDatabaseSchema(pool) {
  if (schemaReady) return;
  if (schemaInitPromise) return schemaInitPromise;

  schemaInitPromise = (async () => {
    const connection = await pool.getConnection();

    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id VARCHAR(255) NOT NULL PRIMARY KEY,
          applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
      `);

      const [rows] = await connection.query('SELECT id FROM schema_migrations');
      const applied = new Set((rows || []).map((row) => String(row.id)));
      const migrations = await readMigrations();
      const pending = migrations.filter((migration) => !applied.has(migration.id));

      for (const migration of pending) {
        const statements = splitSqlStatements(migration.sql);
        for (const statement of statements) {
          await connection.query(statement);
        }
        await connection.execute('INSERT IGNORE INTO schema_migrations (id) VALUES (?)', [migration.id]);
      }

      schemaReady = true;
    } finally {
      connection.release();
      schemaInitPromise = null;
    }
  })();

  return schemaInitPromise;
}
