import * as mysqlQueries from './db/queries.mjs';
import { getPool } from './db/connection.mjs';

// In-memory fallback storage
let memoryTransactions = [
  { id: 1, type: 'expense', description: 'Apple Store', category: 'Technology', amount: 1299, currency: 'INR', occurredAt: '2023-10-24T14:45:00.000Z' },
  { id: 2, type: 'income', description: 'Monthly Salary', category: 'Salary', amount: 12450, currency: 'INR', occurredAt: '2023-10-01T09:00:00.000Z' },
  { id: 3, type: 'expense', description: 'Lumière Dining', category: 'Food', amount: 240, currency: 'INR', occurredAt: '2023-09-30T20:15:00.000Z' },
  { id: 4, type: 'expense', description: 'Electric Utility', category: 'Housing', amount: 112, currency: 'INR', occurredAt: '2023-09-21T10:30:00.000Z' },
  { id: 5, type: 'expense', description: 'Skyline Airways', category: 'Transport', amount: 850, currency: 'INR', occurredAt: '2023-09-28T11:30:00.000Z' },
  { id: 6, type: 'expense', description: 'Grocery Shopping', category: 'Food', amount: 450, currency: 'INR', occurredAt: '2023-10-15T10:30:00.000Z' },
  { id: 7, type: 'expense', description: 'Gas Station', category: 'Transport', amount: 120, currency: 'INR', occurredAt: '2023-10-18T08:15:00.000Z' },
  { id: 8, type: 'income', description: 'Freelance Project', category: 'Income', amount: 5000, currency: 'INR', occurredAt: '2023-10-10T14:00:00.000Z' },
];

let memoryGoals = [
  { id: 1, name: 'New Porsche 911', targetAmount: 160000, savedAmount: 104000, currency: 'INR' },
  { id: 2, name: 'Tokyo Trip', targetAmount: 12000, savedAmount: 11040, currency: 'INR' }
];

let memoryUser = {
  id: '1',
  name: 'Demo User',
  email: 'demo@financeflow.local',
  settings: {
    currency: 'INR',
    monthlyGoal: 10000,
    emailNotif: true,
    darkMode: true,
    twoFactor: false
  }
};

// Check if MySQL is available
async function isMySQL() {
  const pool = await getPool();
  return pool !== null;
}

// ============ USER DATA ACCESS ============

export async function getUser(userId = '1') {
  if (await isMySQL()) {
    const user = await mysqlQueries.getUserById(userId);
    if (user) {
      const settings = await mysqlQueries.getUserSettings(userId);
      return {
        ...user,
        settings: settings ? {
          currency: settings.currency,
          monthlyGoal: parseFloat(settings.monthly_goal),
          emailNotif: settings.email_notif,
          darkMode: settings.dark_mode,
          twoFactor: settings.two_factor
        } : {}
      };
    }
    return null;
  }
  return memoryUser;
}

export async function getUserByEmail(email) {
  if (await isMySQL()) {
    return await mysqlQueries.getUserByEmail(email);
  }
  return memoryUser.email === email ? memoryUser : null;
}

// ============ TRANSACTION DATA ACCESS ============

export async function getTransactions(userId = '1', filters = {}) {
  if (await isMySQL()) {
    const rows = await mysqlQueries.getTransactions(userId, filters);
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      description: row.description,
      category: row.category,
      amount: parseFloat(row.amount),
      currency: row.currency,
      occurredAt: row.occurred_at
    }));
  }
  
  // In-memory filtering
  let filtered = [...memoryTransactions];
  
  if (filters.type) filtered = filtered.filter(t => t.type === filters.type);
  if (filters.category) filtered = filtered.filter(t => t.category === filters.category);
  if (filters.search) filtered = filtered.filter(t => 
    t.description.toLowerCase().includes(filters.search.toLowerCase())
  );
  
  filtered = filtered.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  
  if (filters.limit) {
    const offset = parseInt(filters.offset) || 0;
    const limit = parseInt(filters.limit);
    filtered = filtered.slice(offset, offset + limit);
  }
  
  return filtered;
}

export async function getTransactionById(id) {
  if (await isMySQL()) {
    return await mysqlQueries.getTransactionById(id);
  }
  return memoryTransactions.find(t => t.id === parseInt(id));
}

export async function createTransaction(userId = '1', data) {
  if (await isMySQL()) {
    const id = await mysqlQueries.createTransaction(userId, data);
    return id ? await mysqlQueries.getTransactionById(id) : null;
  }
  
  const newTx = {
    id: Math.max(...memoryTransactions.map(t => t.id)) + 1,
    ...data,
    amount: parseFloat(data.amount)
  };
  memoryTransactions.push(newTx);
  return newTx;
}

export async function deleteTransaction(id) {
  if (await isMySQL()) {
    return await mysqlQueries.deleteTransaction(id);
  }
  
  const index = memoryTransactions.findIndex(t => t.id === parseInt(id));
  if (index === -1) return false;
  memoryTransactions.splice(index, 1);
  return true;
}

// ============ GOALS DATA ACCESS ============

export async function getGoals(userId = '1') {
  if (await isMySQL()) {
    const rows = await mysqlQueries.getGoals(userId);
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      targetAmount: parseFloat(row.target_amount),
      savedAmount: parseFloat(row.saved_amount),
      currency: row.currency
    }));
  }
  return memoryGoals;
}

export async function createGoal(userId = '1', data) {
  if (await isMySQL()) {
    return await mysqlQueries.createGoal(userId, data);
  }
  
  const newGoal = {
    id: Math.max(...memoryGoals.map(g => g.id)) + 1,
    ...data
  };
  memoryGoals.push(newGoal);
  return newGoal.id;
}

// ============ SETTINGS DATA ACCESS ============

export async function getUserSettings(userId = '1') {
  if (await isMySQL()) {
    return await mysqlQueries.getUserSettings(userId);
  }
  return memoryUser.settings;
}

export async function updateUserSettings(userId = '1', settings) {
  if (await isMySQL()) {
    return await mysqlQueries.updateUserSettings(userId, settings);
  }
  
  memoryUser.settings = { ...memoryUser.settings, ...settings };
  return true;
}

// ============ STATS CALCULATION ============

export async function getTransactionStats(userId = '1') {
  const transactions = await getTransactions(userId);
  
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;
  
  // Monthly data (simplified - in real app would query by month)
  const monthlyData = [
    { month: 'Jan', income: 12000, expenses: 3200 },
    { month: 'Feb', income: 11800, expenses: 2900 },
    { month: 'Mar', income: 13200, expenses: 3100 },
    { month: 'Apr', income: 12450, expenses: 2850 },
    { month: 'May', income: 14100, expenses: 3300 },
    { month: 'Jun', income: totalIncome, expenses: totalExpenses }
  ];
  
  const weeklyTrend = [
    { week: 'Week 1', income: 3200, expenses: 800 },
    { week: 'Week 2', income: 2800, expenses: 900 },
    { week: 'Week 3', income: 4100, expenses: 750 },
    { week: 'Week 4', income: totalIncome * 0.25, expenses: totalExpenses * 0.25 }
  ];
  
  const categoryBreakdown = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
  
  return {
    totalIncome,
    totalExpenses,
    balance,
    savingsRate,
    monthlyData,
    weeklyTrend,
    categoryBreakdown,
    financialHealthScore: Math.min(100, Math.round(savingsRate * 1.5))
  };
}
