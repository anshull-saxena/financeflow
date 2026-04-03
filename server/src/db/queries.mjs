import { query } from './connection.mjs';

// ============ USER QUERIES ============

export async function getUserById(userId) {
  const rows = await query(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );
  return rows?.[0] || null;
}

export async function getUserByEmail(email) {
  const rows = await query(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  return rows?.[0] || null;
}

export async function createUser(name, email) {
  const result = await query(
    'INSERT INTO users (name, email) VALUES (?, ?)',
    [name, email]
  );
  return result?.insertId || null;
}

// ============ TRANSACTION QUERIES ============

export async function getTransactions(userId, filters = {}) {
  let sql = 'SELECT * FROM transactions WHERE user_id = ?';
  const params = [userId];
  
  if (filters.type) {
    sql += ' AND type = ?';
    params.push(filters.type);
  }
  
  if (filters.category) {
    sql += ' AND category = ?';
    params.push(filters.category);
  }
  
  if (filters.search) {
    sql += ' AND description LIKE ?';
    params.push(`%${filters.search}%`);
  }
  
  sql += ' ORDER BY occurred_at DESC';
  
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit));
    
    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(parseInt(filters.offset));
    }
  }
  
  return await query(sql, params) || [];
}

export async function getTransactionById(id) {
  const rows = await query(
    'SELECT * FROM transactions WHERE id = ?',
    [id]
  );
  return rows?.[0] || null;
}

export async function createTransaction(userId, data) {
  const result = await query(
    'INSERT INTO transactions (user_id, type, description, category, amount, currency, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, data.type, data.description, data.category, data.amount, data.currency, data.occurredAt]
  );
  return result?.insertId || null;
}

export async function deleteTransaction(id) {
  const result = await query(
    'DELETE FROM transactions WHERE id = ?',
    [id]
  );
  return result?.affectedRows > 0;
}

export async function getTransactionStats(userId) {
  const transactions = await getTransactions(userId);
  
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;
  
  return {
    totalIncome,
    totalExpenses,
    balance,
    savingsRate,
    transactionCount: transactions.length
  };
}

// ============ GOALS QUERIES ============

export async function getGoals(userId) {
  return await query(
    'SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  ) || [];
}

export async function createGoal(userId, data) {
  const result = await query(
    'INSERT INTO goals (user_id, name, target_amount, saved_amount, currency) VALUES (?, ?, ?, ?, ?)',
    [userId, data.name, data.targetAmount, data.savedAmount || 0, data.currency]
  );
  return result?.insertId || null;
}

export async function updateGoal(id, data) {
  const result = await query(
    'UPDATE goals SET name = ?, target_amount = ?, saved_amount = ?, currency = ? WHERE id = ?',
    [data.name, data.targetAmount, data.savedAmount, data.currency, id]
  );
  return result?.affectedRows > 0;
}

export async function deleteGoal(id) {
  const result = await query(
    'DELETE FROM goals WHERE id = ?',
    [id]
  );
  return result?.affectedRows > 0;
}

// ============ SETTINGS QUERIES ============

export async function getUserSettings(userId) {
  const rows = await query(
    'SELECT * FROM user_settings WHERE user_id = ?',
    [userId]
  );
  return rows?.[0] || null;
}

export async function updateUserSettings(userId, settings) {
  const result = await query(
    `INSERT INTO user_settings (user_id, currency, monthly_goal, email_notif, dark_mode, two_factor)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
     currency = VALUES(currency),
     monthly_goal = VALUES(monthly_goal),
     email_notif = VALUES(email_notif),
     dark_mode = VALUES(dark_mode),
     two_factor = VALUES(two_factor)`,
    [userId, settings.currency, settings.monthlyGoal, settings.emailNotif, settings.darkMode, settings.twoFactor]
  );
  return result !== null;
}
