import * as mysqlQueries from './db/queries.mjs';
import { getPool } from './db/connection.mjs';

// In-memory fallback storage
let memoryTransactions = [];

let memoryGoals = [];

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

let defaultUserEnsured = false;
async function ensureDefaultUser(userId = '1') {
  if (defaultUserEnsured) return;
  if (!(await isMySQL())) return;

  await mysqlQueries.ensureUserById(userId, 'Demo User', 'demo@financeflow.local');
  await mysqlQueries.ensureUserSettings(userId, {
    currency: 'INR',
    monthlyGoal: 10000,
    emailNotif: false,
    darkMode: true,
    twoFactor: false
  });
  defaultUserEnsured = true;
}

export async function getUser(userId = '1') {
  if (await isMySQL()) {
    await ensureDefaultUser(userId);
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
    await ensureDefaultUser('1');
    return await mysqlQueries.getUserByEmail(email);
  }
  return memoryUser.email === email ? memoryUser : null;
}

export async function getTransactions(userId = '1', filters = {}) {
  if (await isMySQL()) {
    await ensureDefaultUser(userId);
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
    await ensureDefaultUser('1');
    const row = await mysqlQueries.getTransactionById(id);
    if (!row) return null;
    return {
      id: row.id,
      type: row.type,
      description: row.description,
      category: row.category,
      amount: parseFloat(row.amount),
      currency: row.currency,
      occurredAt: row.occurred_at
    };
  }
  return memoryTransactions.find(t => t.id === parseInt(id));
}

export async function createTransaction(userId = '1', data) {
  console.log('dataAccess.createTransaction called with:', { userId, data });
  
  if (await isMySQL()) {
    await ensureDefaultUser(userId);
    console.log('Using MySQL to create transaction');
    const id = await mysqlQueries.createTransaction(userId, data);
    console.log('MySQL transaction created with ID:', id);
    const row = id ? await mysqlQueries.getTransactionById(id) : null;
    if (!row) return null;
    return {
      id: row.id,
      type: row.type,
      description: row.description,
      category: row.category,
      amount: parseFloat(row.amount),
      currency: row.currency,
      occurredAt: row.occurred_at
    };
  }

  console.log('Using in-memory storage to create transaction');
  const nextId = memoryTransactions.length > 0 ? Math.max(...memoryTransactions.map(t => t.id)) + 1 : 1;
  const newTx = {
    id: nextId,
    ...data,
    amount: parseFloat(data.amount)
  };
  memoryTransactions.push(newTx);
  console.log('In-memory transaction created:', newTx);
  return newTx;
}

export async function deleteTransaction(id) {
  if (await isMySQL()) {
    await ensureDefaultUser('1');
    return await mysqlQueries.deleteTransaction(id);
  }
  
  const index = memoryTransactions.findIndex(t => t.id === parseInt(id));
  if (index === -1) return false;
  memoryTransactions.splice(index, 1);
  return true;
}

export async function getGoals(userId = '1') {
  if (await isMySQL()) {
    await ensureDefaultUser(userId);
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
    await ensureDefaultUser(userId);
    return await mysqlQueries.createGoal(userId, data);
  }
  
  const nextId = memoryGoals.length > 0 ? Math.max(...memoryGoals.map(g => g.id)) + 1 : 1;
  const newGoal = {
    id: nextId,
    ...data
  };
  memoryGoals.push(newGoal);
  return newGoal.id;
}

export async function getUserSettings(userId = '1') {
  if (await isMySQL()) {
    await ensureDefaultUser(userId);
    return await mysqlQueries.getUserSettings(userId);
  }
  return memoryUser.settings;
}

export async function updateUserSettings(userId = '1', settings) {
  if (await isMySQL()) {
    await ensureDefaultUser(userId);
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
