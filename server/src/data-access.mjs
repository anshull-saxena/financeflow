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

async function isMySQL() {
  const pool = await getPool();
  return pool !== null;
}

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
  console.log('dataAccess.createTransaction called with:', { userId, data });
  
  if (await isMySQL()) {
    console.log('Using MySQL to create transaction');
    const id = await mysqlQueries.createTransaction(userId, data);
    console.log('MySQL transaction created with ID:', id);
    return id ? await mysqlQueries.getTransactionById(id) : null;
  }

  console.log('Using in-memory storage to create transaction');
  const newTx = {
    id: Math.max(...memoryTransactions.map(t => t.id)) + 1,
    ...data,
    amount: parseFloat(data.amount)
  };
  memoryTransactions.push(newTx);
  console.log('In-memory transaction created:', newTx);
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

  // Calculate monthly data dynamically from actual transactions
  const now = new Date();
  const monthlyData = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Get last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    const monthIncome = transactions
      .filter(t => t.type === 'income' && (t.occurredAt || t.date).startsWith(monthKey))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const monthExpenses = transactions
      .filter(t => t.type === 'expense' && (t.occurredAt || t.date).startsWith(monthKey))
      .reduce((sum, t) => sum + t.amount, 0);
    
    monthlyData.push({
      month: monthNames[d.getMonth()],
      income: monthIncome,
      expenses: monthExpenses
    });
  }

  // Calculate weekly trend for current month
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthTransactions = transactions.filter(t => (t.occurredAt || t.date).startsWith(currentMonth));
  
  const weeklyTrend = [];
  for (let week = 0; week < 4; week++) {
    const weekStart = week * 7;
    const weekEnd = weekStart + 7;
    
    const weekIncome = monthTransactions
      .filter(t => {
        const day = new Date(t.occurredAt || t.date).getDate();
        return t.type === 'income' && day > weekStart && day <= weekEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    const weekExpenses = monthTransactions
      .filter(t => {
        const day = new Date(t.occurredAt || t.date).getDate();
        return t.type === 'expense' && day > weekStart && day <= weekEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    weeklyTrend.push({
      week: `Week ${week + 1}`,
      income: weekIncome,
      expenses: weekExpenses
    });
  }

  // Category breakdown
  const categoryBreakdown = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  // Financial Health Score calculation (0-100)
  // Based on: savings rate (40%), expense consistency (30%), income growth (30%)
  const savingsRateScore = Math.min(100, Math.round(savingsRate * 2)); // 40% weight
  
  // Expense consistency - lower is better
  const expenseScore = totalExpenses > 0 && totalIncome > 0 
    ? Math.max(0, 100 - Math.round((totalExpenses / totalIncome) * 100))
    : 50;
  
  // Income growth - compare this month to last month
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthIncome = transactions
    .filter(t => t.type === 'income' && (t.occurredAt || t.date).startsWith(lastMonthKey))
    .reduce((sum, t) => sum + t.amount, 0);
  
  const incomeGrowth = lastMonthIncome > 0 
    ? ((totalIncome - lastMonthIncome) / lastMonthIncome) * 100
    : 0;
  const incomeGrowthScore = Math.min(100, Math.max(0, 50 + Math.round(incomeGrowth * 2)));
  
  const financialHealthScore = Math.round(
    (savingsRateScore * 0.4) + (expenseScore * 0.3) + (incomeGrowthScore * 0.3)
  );

  return {
    totalIncome,
    totalExpenses,
    balance,
    savingsRate,
    monthlyData,
    weeklyTrend,
    categoryBreakdown,
    financialHealthScore: Math.min(100, Math.max(0, financialHealthScore))
  };
}
