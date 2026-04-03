import mysql from 'mysql2/promise';
import { dbConfig } from './config.js';

export const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  connectionLimit: 10,
  namedPlaceholders: true,
  decimalNumbers: true,
  charset: 'utf8mb4',
});

// Test database connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
})();
