import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'financeflow',
  password: process.env.DB_PASSWORD || 'financeflow',
  database: process.env.DB_NAME || 'financeflow',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;

export async function getPool() {
  if (!pool) {
    try {
      pool = mysql.createPool(config);
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
