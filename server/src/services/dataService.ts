import { pool } from '../db/pool.js';
import type { RowDataPacket } from 'mysql2';
import { createError } from '../middleware/errorHandler.js';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Transaction {
  id: number;
  userId: string;
  type: 'income' | 'expense';
  description: string;
  category: string;
  amount: number;
  currency: string;
  occurredAt: string;
  createdAt: string;
}

export interface Goal {
  id: number;
  userId: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  currency: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  monthlyData: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  recentTransactions: Transaction[];
}

type UserRow = RowDataPacket & User;
type TransactionRow = RowDataPacket & Transaction;
type GoalRow = RowDataPacket & Goal;
type StatsRow = RowDataPacket & { type: string; total: number };
type MonthlyRow = RowDataPacket & { month: string; income: number; expenses: number };
type CategoryRow = RowDataPacket & { category: string; amount: number };

export class DataService {
  static async getUser(email: string = 'demo@financeflow.local'): Promise<User> {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT id, name, email, created_at as createdAt FROM users WHERE email = ?',
      [email]
    );
    
    if (rows.length === 0) {
      throw createError('User not found', 404);
    }
    
    return rows[0]!;
  }

  static async getTransactionsByUserId(
    userId: string, 
    options: {
      type?: 'income' | 'expense';
      category?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Transaction[]> {
    let sql = `
      SELECT 
        id, user_id as userId, type, description, category, 
        amount, currency, occurred_at as occurredAt, created_at as createdAt
      FROM transactions 
      WHERE user_id = ?
    `;
    const params: any[] = [userId];

    if (options.type) {
      sql += ' AND type = ?';
      params.push(options.type);
    }

    if (options.category) {
      sql += ' AND category = ?';
      params.push(options.category);
    }

    sql += ' ORDER BY occurred_at DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
      
      if (options.offset) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const [rows] = await pool.query<TransactionRow[]>(sql, params);
    return rows;
  }

  static async getUserStats(userId: string, months: number = 12): Promise<DashboardStats> {
    // Get current month totals
    const [currentStats] = await pool.query<StatsRow[]>(`
      SELECT 
        type,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = ? 
        AND DATE(occurred_at) >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
      GROUP BY type
    `, [userId]);

    let totalIncome = 0;
    let totalExpenses = 0;
    
    currentStats.forEach(stat => {
      if (stat.type === 'income') totalIncome = Number(stat.total);
      if (stat.type === 'expense') totalExpenses = Number(stat.total);
    });

    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

    // Get monthly comparison data
    const [monthlyData] = await pool.query<MonthlyRow[]>(`
      SELECT 
        DATE_FORMAT(occurred_at, '%b') as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
      FROM transactions 
      WHERE user_id = ? 
        AND occurred_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(occurred_at, '%Y-%m'), DATE_FORMAT(occurred_at, '%b')
      ORDER BY DATE_FORMAT(occurred_at, '%Y-%m')
    `, [userId, months]);

    // Get category breakdown
    const [categoryData] = await pool.query<CategoryRow[]>(`
      SELECT 
        category,
        SUM(amount) as amount
      FROM transactions 
      WHERE user_id = ? 
        AND type = 'expense'
        AND DATE(occurred_at) >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
      GROUP BY category
      ORDER BY amount DESC
    `, [userId]);

    const categoryBreakdown = categoryData.map(cat => ({
      category: cat.category,
      amount: Number(cat.amount),
      percentage: totalExpenses > 0 ? Math.round((Number(cat.amount) / totalExpenses) * 100) : 0
    }));

    // Get recent transactions
    const recentTransactions = await this.getTransactionsByUserId(userId, { limit: 10 });

    return {
      totalIncome,
      totalExpenses,
      balance,
      savingsRate,
      monthlyData: monthlyData.map(m => ({
        month: m.month,
        income: Number(m.income),
        expenses: Number(m.expenses)
      })),
      categoryBreakdown,
      recentTransactions
    };
  }

  static async getGoalsByUserId(userId: string): Promise<Goal[]> {
    const [rows] = await pool.query<GoalRow[]>(`
      SELECT 
        id, user_id as userId, name, target_amount as targetAmount,
        saved_amount as savedAmount, currency,
        ROUND((saved_amount / target_amount) * 100, 1) as progress,
        created_at as createdAt, updated_at as updatedAt
      FROM goals 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);
    
    return rows.map(row => ({
      ...row,
      targetAmount: Number(row.targetAmount),
      savedAmount: Number(row.savedAmount),
      progress: Number(row.progress)
    }));
  }

  static async createTransaction(
    userId: string, 
    data: Omit<Transaction, 'id' | 'userId' | 'createdAt'>
  ): Promise<Transaction> {
    const [result] = await pool.execute(`
      INSERT INTO transactions (user_id, type, description, category, amount, currency, occurred_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, data.type, data.description, data.category, data.amount, data.currency, data.occurredAt]);

    const insertId = (result as any).insertId;
    const [rows] = await pool.query<TransactionRow[]>(
      'SELECT * FROM transactions WHERE id = ?',
      [insertId]
    );

    return rows[0]!;
  }

  static async updateTransaction(
    id: number, 
    userId: string, 
    data: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>
  ): Promise<Transaction> {
    const updates = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = key === 'occurredAt' ? 'occurred_at' : key;
        updates.push(`${dbKey} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      throw createError('No fields to update', 400);
    }

    values.push(id, userId);
    
    await pool.execute(
      `UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    const [rows] = await pool.query<TransactionRow[]>(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (rows.length === 0) {
      throw createError('Transaction not found', 404);
    }

    return rows[0]!;
  }

  static async deleteTransaction(id: number, userId: string): Promise<void> {
    const [result] = await pool.execute(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if ((result as any).affectedRows === 0) {
      throw createError('Transaction not found', 404);
    }
  }
}