import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

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

export async function getPool() {
  if (!pool) {
    try {
      pool = mysql.createPool(getPoolConfig());
      // Test connection
      const connection = await pool.getConnection();
      console.log('✅ MySQL connected successfully');
      connection.release();
    } catch (error) {
      console.log('⚠️  MySQL not available, using in-memory storage');
      console.log('   Run setup-mysql.sh to set up MySQL database');
      pool = null;
    }
  }
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
