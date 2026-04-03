import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getPool } from './db/connection.mjs';
import * as dataAccess from './data-access.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/static', express.static(path.join(__dirname, '../../financeflow')));

// Initialize database connection
(async () => {
  const pool = await getPool();
  if (pool) {
    console.log('📊 Using MySQL database for data persistence');
  } else {
    console.log('💾 Using in-memory storage (run ./setup-mysql.sh to enable MySQL)');
  }
})();

// Routes - Serve pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../../financeflow/dashboard/code.html')));
app.get('/expenses', (req, res) => res.sendFile(path.join(__dirname, '../../financeflow/expenses_page/expenses-dynamic.html')));
app.get('/income', (req, res) => res.sendFile(path.join(__dirname, '../../financeflow/income_page/income-dynamic.html')));
app.get('/analytics', (req, res) => res.sendFile(path.join(__dirname, '../../financeflow/reports_analytics/analytics-dynamic.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, '../../financeflow/settings/settings-dynamic.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../../financeflow/auth/login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, '../../financeflow/auth/signup.html')));

// API: Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'FinanceFlow API' });
});

// API: Dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    const user = await dataAccess.getUser();
    const stats = await dataAccess.getTransactionStats();
    const transactions = await dataAccess.getTransactions('1', { limit: 5 });
    const goals = await dataAccess.getGoals();
    
    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email },
        stats: {
          ...stats,
          recentTransactions: transactions.map(t => ({
            ...t,
            amount: t.type === 'income' ? t.amount : -t.amount
          }))
        },
        goals: goals.map(g => ({
          ...g,
          progress: Math.round((g.savedAmount / g.targetAmount) * 100)
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get all transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const { type, category, search, limit = 50, offset = 0 } = req.query;
    const transactions = await dataAccess.getTransactions('1', { type, category, search, limit, offset });
    const allTransactions = await dataAccess.getTransactions('1', { type, category, search });
    
    res.json({
      success: true,
      data: {
        transactions,
        total: allTransactions.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get single transaction
app.get('/api/transactions/:id', async (req, res) => {
  try {
    const tx = await dataAccess.getTransactionById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });
    res.json({ success: true, data: tx });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Create transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const { type, description, category, amount, currency = 'INR', occurredAt } = req.body;
    if (!type || !description || !category || !amount) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const newTx = await dataAccess.createTransaction('1', {
      type, description, category,
      amount: parseFloat(amount),
      currency,
      occurredAt: occurredAt || new Date().toISOString()
    });
    
    res.status(201).json({ success: true, data: newTx });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Delete transaction
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const success = await dataAccess.deleteTransaction(req.params.id);
    if (!success) return res.status(404).json({ success: false, error: 'Transaction not found' });
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const stats = await dataAccess.getTransactionStats();
    
    res.json({
      success: true,
      data: {
        stats: {
          totalIncome: stats.totalIncome,
          totalExpenses: stats.totalExpenses,
          balance: stats.balance,
          savingsRate: stats.savingsRate,
          financialHealthScore: stats.financialHealthScore
        },
        weeklyTrend: stats.weeklyTrend,
        monthlyData: stats.monthlyData,
        categoryBreakdown: Object.entries(stats.categoryBreakdown || {}).map(([category, amount]) => ({
          category,
          amount
        }))
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get goals
app.get('/api/goals', async (req, res) => {
  try {
    const goals = await dataAccess.getGoals();
    res.json({
      success: true,
      data: goals.map(g => ({
        ...g,
        progress: Math.round((g.savedAmount / g.targetAmount) * 100)
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get user settings
app.get('/api/settings', async (req, res) => {
  try {
    const user = await dataAccess.getUser();
    res.json({
      success: true,
      data: {
        user: { name: user.name, email: user.email },
        settings: user.settings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Update user settings
app.put('/api/settings', async (req, res) => {
  try {
    const { currency, monthlyGoal, emailNotif, darkMode, twoFactor } = req.body;
    const success = await dataAccess.updateUserSettings('1', {
      currency,
      monthlyGoal: parseFloat(monthlyGoal),
      emailNotif: Boolean(emailNotif),
      darkMode: Boolean(darkMode),
      twoFactor: Boolean(twoFactor)
    });
    
    if (!success) return res.status(500).json({ success: false, error: 'Failed to update settings' });
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Auth - Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email === 'demo@financeflow.local' && password === 'demo123') {
      const user = await dataAccess.getUserByEmail(email);
      res.json({
        success: true,
        data: {
          token: 'demo-token-' + Date.now(),
          user: { id: user?.id || '1', name: user?.name || 'Demo User', email }
        }
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Auth - Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const existingUser = await dataAccess.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }
    
    res.status(201).json({
      success: true,
      data: {
        token: 'demo-token-' + Date.now(),
        user: { id: '1', name, email }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 FinanceFlow Server Started`);
  console.log(`================================`);
  console.log(`📍 Local:   http://localhost:${PORT}`);
  console.log(`🔧 API:     http://localhost:${PORT}/api`);
  console.log(`💚 Health:  http://localhost:${PORT}/health`);
  console.log(`================================\n`);
});
