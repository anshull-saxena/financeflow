import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { ensureDatabaseSchema } from './migrations.mjs';
import { ensurePostgresSchema } from './migrations-postgres.mjs';

dotenv.config();

function parseBool(value) {
  if (value === undefined) return undefined;
  return String(value).toLowerCase() === 'true';
}

function getPoolConfig() {
  // Prefer a single connection string when provided (common on Vercel/managed DBs)
  const databaseUrl = process.env.DATABASE_URL || process.env.DB_URL || process.env.POSTGRES_URL;
  if (databaseUrl) {
    if (String(databaseUrl).startsWith('postgres://') || String(databaseUrl).startsWith('postgresql://')) {
      return { dialect: 'postgres', config: databaseUrl };
    }
    return { dialect: 'mysql', config: databaseUrl };
  }

  const useSsl = parseBool(process.env.DB_SSL);
  const rejectUnauthorized = parseBool(process.env.DB_SSL_REJECT_UNAUTHORIZED);

  return {
    dialect: 'mysql',
    config: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'financeflow',
      password: process.env.DB_PASSWORD || 'financeflow',
      database: process.env.DB_NAME || 'financeflow',
      ssl: useSsl
        ? {
            rejectUnauthorized: rejectUnauthorized === undefined ? true : rejectUnauthorized
          }
        : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    }
  };
}

let pool = null;
let poolInitPromise = null;
let dialect = 'none';

function toPostgresQuery(sql, params = []) {
  let index = 0;
  return {
    text: String(sql).replace(/\?/g, () => `$${++index}`),
    values: params
  };
}

export async function getPool() {
  if (pool) return pool;

  if (!poolInitPromise) {
    poolInitPromise = (async () => {
      let createdPool = null;
      try {
        const target = getPoolConfig();
        dialect = target.dialect;

        if (dialect === 'postgres') {
          const { Pool } = await import('pg');
          createdPool = new Pool({
            connectionString: target.config,
            max: 10
          });
          const client = await createdPool.connect();
          await client.query('SELECT 1');
          client.release();

          await ensurePostgresSchema(createdPool);
        } else {
          createdPool = mysql.createPool(target.config);
          const connection = await createdPool.getConnection();
          connection.release();

          await ensureDatabaseSchema(createdPool);
        }
        console.log('✅ SQL database connected successfully');
        pool = createdPool;
      } catch (error) {
        console.log('⚠️  SQL database not available, using in-memory storage');
        console.log('   Set DATABASE_URL (or DB_* env vars) to enable persistent SQL storage');
        if (createdPool) {
          try {
            await createdPool.end();
          } catch (_endError) {
            // no-op
          }
        }
        pool = null;
        dialect = 'none';
      } finally {
        poolInitPromise = null;
      }
    })();
  }

  await poolInitPromise;
  return pool;
}

export async function query(sql, params) {
  const p = await getPool();
  if (!p) return null;
  
  try {
    if (dialect === 'postgres') {
      const { text, values } = toPostgresQuery(sql, params || []);
      const result = await p.query(text, values);
      const command = String(result?.command || '').toUpperCase();

      if (command === 'SELECT' || command === 'WITH') {
        return result.rows;
      }
      if (command === 'INSERT') {
        return {
          insertId: result.rows?.[0]?.id ?? null,
          affectedRows: result.rowCount || 0
        };
      }
      return {
        affectedRows: result.rowCount || 0
      };
    }

    const [rows] = await p.execute(sql, params || []);
    return rows;
  } catch (error) {
    console.error('Database query error:', error.message, 'SQL:', sql, 'PARAMS:', params);
    return null;
  }
}

export function getDialect() {
  return dialect;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    dialect = 'none';
  }
}
