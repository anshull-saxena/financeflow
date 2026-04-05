import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { ensureDatabaseSchema } from './migrations.mjs';

dotenv.config();

function parseBool(value) {
  if (value === undefined) return undefined;
  return String(value).toLowerCase() === 'true';
}

function getPoolConfig() {
  // Prefer a single connection string when provided (common on Vercel/managed DBs)
  const databaseUrl = process.env.DATABASE_URL || process.env.DB_URL;
  if (databaseUrl) return databaseUrl;

  const useSsl = parseBool(process.env.DB_SSL);
  const rejectUnauthorized = parseBool(process.env.DB_SSL_REJECT_UNAUTHORIZED);

  return {
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
  };
}

let pool = null;
let poolInitPromise = null;

export async function getPool() {
  if (pool) return pool;

  if (!poolInitPromise) {
    poolInitPromise = (async () => {
      let createdPool = null;
      try {
        createdPool = mysql.createPool(getPoolConfig());
        const connection = await createdPool.getConnection();
        connection.release();

        await ensureDatabaseSchema(createdPool);
        console.log('✅ MySQL connected successfully');
        pool = createdPool;
      } catch (error) {
        console.log('⚠️  MySQL not available, using in-memory storage');
        console.log('   Set DATABASE_URL (or DB_* env vars) to enable persistent SQL storage');
        if (createdPool) {
          try {
            await createdPool.end();
          } catch (_endError) {
            // no-op
          }
        }
        pool = null;
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
    const [rows] = await p.execute(sql, params || []);
    return rows;
  } catch (error) {
    console.error('Database query error:', error.message, 'SQL:', sql, 'PARAMS:', params);
    return null;
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
