import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RowDataPacket } from 'mysql2';
import mysql from 'mysql2/promise';
import { dbConfig } from './config.js';

// Migrations contain multiple SQL statements per file. Enable `multipleStatements`
// *only* for the migration runner to avoid broadening query attack surface elsewhere.
const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  connectionLimit: 2,
  namedPlaceholders: true,
  decimalNumbers: true,
  charset: 'utf8mb4',
  multipleStatements: true,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Migration = { id: string; filename: string; sql: string };

async function ensureMigrationsTable(): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);
}

async function readMigrations(): Promise<Migration[]> {
  const migrationsDir = path.resolve(__dirname, '../../migrations');
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith('.sql'))
    .map((e) => e.name)
    .sort();

  const migrations: Migration[] = [];
  for (const filename of files) {
    const fullPath = path.join(migrationsDir, filename);
    const sql = await fs.readFile(fullPath, 'utf8');
    const id = filename;
    migrations.push({ id, filename, sql });
  }
  return migrations;
}

async function appliedIds(): Promise<Set<string>> {
  type MigrationRow = RowDataPacket & { id: string };
  const [rows] = await pool.query<MigrationRow[]>('SELECT id FROM schema_migrations');
  return new Set(rows.map((r) => String(r.id)));
}

async function applyMigration(m: Migration): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(m.sql);
    await conn.execute('INSERT INTO schema_migrations (id) VALUES (?)', [m.id]);
    await conn.commit();
    console.log(`Applied ${m.filename}`);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function main(): Promise<void> {
  await ensureMigrationsTable();
  const migrations = await readMigrations();
  const applied = await appliedIds();

  const pending = migrations.filter((m) => !applied.has(m.id));
  if (pending.length === 0) {
    // eslint-disable-next-line no-console
    console.log('No pending migrations');
    return;
  }

  for (const m of pending) {
    await applyMigration(m);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
