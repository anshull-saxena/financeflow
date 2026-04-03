import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getPool, query } from './db/connection.mjs';

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
let useMySQL = false;
(async () => {
  const pool = await getPool();
  useMySQL = pool !== null;
  if (useMySQL) {
    console.log('📊 Using MySQL database');
  } else {
    console.log('💾 Using in-memory storage (run setup-mysql.sh to enable MySQL)');
  }
})();

// Mock database (in production, this would be MySQL)
let transactions = [
  { id: 1, type: 'expense', description: 'Apple Store', category: 'Technology', amount: 1299, currency: 'INR', occurredAt: '2023-10-24T14:45:00.000Z' },
  { id: 2, type: 'income', description: 'Monthly Salary', category: 'Salary', amount: 12450, currency: 'INR', occurredAt: '2023-10-01T09:00:00.000Z' },
  { id: 3, type: 'expense', description: 'Lumière Dining', category: 'Food', amount: 240, currency: 'INR', occurredAt: '2023-09-30T20:15:00.000Z' },
  { id: 4, type: 'expense', description: 'Electric Utility', category: 'Housing', amount: 112, currency: 'INR', occurredAt: '2023-09-21T10:30:00.000Z' },
  { id: 5, type: 'expense', description: 'Skyline Airways', category: 'Transport', amount: 850, currency: 'INR', occurredAt: '2023-09-28T11:30:00.000Z' },
  { id: 6, type: 'expense', description: 'Grocery Shopping', category: 'Food', amount: 450, currency: 'INR', occurredAt: '2023-10-15T10:30:00.000Z' },
  { id: 7, type: 'expense', description: 'Gas Station', category: 'Transport', amount: 120, currency: 'INR', occurredAt: '2023-10-18T08:15:00.000Z' },
  { id: 8, type: 'income', description: 'Freelance Project', category: 'Income', amount: 5000, currency: 'INR', occurredAt: '2023-10-10T14:00:00.000Z' },
];

let goals = [
  { id: 1, name: 'New Porsche 911', targetAmount: 160000, savedAmount: 104000, currency: 'INR' },
  { id: 2, name: 'Tokyo Trip', targetAmount: 12000, savedAmount: 11040, currency: 'INR' }
];

let user = {
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

// Helper functions
function calculateStats(txs) {
  const totalIncome = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;
  
  // Monthly data (last 6 months)
  const monthlyData = [
    { month: 'Jan', income: 12000, expenses: 3200 },
    { month: 'Feb', income: 11800, expenses: 2900 },
    { month: 'Mar', income: 12200, expenses: 3100 },
    { month: 'Apr', income: 12450, expenses: 3589 },
    { month: 'May', income: 12300, expenses: 2800 },
    { month: 'Jun', income: totalIncome, expenses: totalExpenses }
  ];
  
  // Category breakdown
  const categoryTotals = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });
  
  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: Math.round((amount / totalExpenses) * 100)
    }))
    .sort((a, b) => b.amount - a.amount);
  
  return { totalIncome, totalExpenses, balance, savingsRate, monthlyData, categoryBreakdown };
}

// Routes

// Serve pages
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
app.get('/api/dashboard', (req, res) => {
  const stats = calculateStats(transactions);
  res.json({
    success: true,
    data: {
      user: { id: user.id, name: user.name, email: user.email },
      stats: {
        ...stats,
        recentTransactions: transactions.slice(0, 5).map(t => ({
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
});

// API: Get all transactions
app.get('/api/transactions', (req, res) => {
  const { type, category, search, limit = 50, offset = 0 } = req.query;
  
  let filtered = [...transactions];
  
  if (type) filtered = filtered.filter(t => t.type === type);
  if (category) filtered = filtered.filter(t => t.category === category);
  if (search) filtered = filtered.filter(t => 
    t.description.toLowerCase().includes(search.toLowerCase())
  );
  
  const total = filtered.length;
  const results = filtered
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
    .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  
  res.json({
    success: true,
    data: {
      transactions: results,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
});

// API: Get single transaction
app.get('/api/transactions/:id', (req, res) => {
  const tx = transactions.find(t => t.id === parseInt(req.params.id));
  if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });
  res.json({ success: true, data: tx });
});

// API: Create transaction
app.post('/api/transactions', (req, res) => {
  const { type, description, category, amount, currency = 'INR', occurredAt } = req.body;
  
  if (!type || !description || !category || !amount) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  
  const newTx = {
    id: Math.max(...transactions.map(t => t.id)) + 1,
    type,
    description,
    category,
    amount: parseFloat(amount),
    currency,
    occurredAt: occurredAt || new Date().toISOString()
  };
  
  transactions.push(newTx);
  res.status(201).json({ success: true, data: newTx });
});

// API: Update transaction
app.put('/api/transactions/:id', (req, res) => {
  const index = transactions.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ success: false, error: 'Transaction not found' });
  
  transactions[index] = { ...transactions[index], ...req.body, id: transactions[index].id };
  res.json({ success: true, data: transactions[index] });
});

// API: Delete transaction
app.delete('/api/transactions/:id', (req, res) => {
  const index = transactions.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ success: false, error: 'Transaction not found' });
  
  transactions.splice(index, 1);
  res.json({ success: true, message: 'Transaction deleted' });
});

// API: Get analytics
app.get('/api/analytics', (req, res) => {
  const stats = calculateStats(transactions);
  
  // Weekly trend
  const weeklyTrend = [
    { week: 'Week 1', income: 3200, expenses: 800 },
    { week: 'Week 2', income: 2800, expenses: 900 },
    { week: 'Week 3', income: 3500, expenses: 950 },
    { week: 'Week 4', income: 2950, expenses: 940 }
  ];
  
  res.json({
    success: true,
    data: {
      ...stats,
      weeklyTrend,
      topExpenseCategories: stats.categoryBreakdown.slice(0, 5)
    }
  });
});

// API: Get goals
app.get('/api/goals', (req, res) => {
  res.json({
    success: true,
    data: goals.map(g => ({
      ...g,
      progress: Math.round((g.savedAmount / g.targetAmount) * 100)
    }))
  });
});

// API: Update goal progress
app.put('/api/goals/:id', (req, res) => {
  const index = goals.findIndex(g => g.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ success: false, error: 'Goal not found' });
  
  goals[index] = { ...goals[index], ...req.body, id: goals[index].id };
  res.json({ success: true, data: goals[index] });
});

// API: Get user settings
app.get('/api/settings', (req, res) => {
  res.json({ success: true, data: user });
});

// API: Update user settings
app.put('/api/settings', (req, res) => {
  user = { ...user, ...req.body };
  res.json({ success: true, data: user });
});

// API: Get categories
app.get('/api/categories', (req, res) => {
  const categories = {
    income: ['Salary', 'Freelance', 'Investment', 'Business', 'Other'],
    expense: ['Housing', 'Food', 'Transport', 'Technology', 'Entertainment', 'Healthcare', 'Shopping', 'Education', 'Other']
  };
  res.json({ success: true, data: categories });
});

// API: Login (simple demo - no real authentication)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Demo authentication
  if (email === 'demo@financeflow.local' && password === 'demo123') {
    res.json({
      success: true,
      data: {
        token: 'demo-token-' + Date.now(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      }
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// API: Signup (simple demo - no real user creation)
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  
  // In a real app, would create user in database
  res.json({
    success: true,
    message: 'Account created successfully',
    data: {
      id: Math.floor(Math.random() * 10000),
      name,
      email
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

app.listen(PORT, () => {
  console.log(`🚀 FinanceFlow API Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/`);
  console.log(`💰 Expenses: http://localhost:${PORT}/expenses`);
  console.log(`💵 Income: http://localhost:${PORT}/income`);
  console.log(`📈 Analytics: http://localhost:${PORT}/analytics`);
  console.log(`⚙️  Settings: http://localhost:${PORT}/settings`);
  console.log(`\n📡 API Endpoints:`);
  console.log(`   GET  /api/dashboard`);
  console.log(`   GET  /api/transactions`);
  console.log(`   POST /api/transactions`);
  console.log(`   PUT  /api/transactions/:id`);
  console.log(`   DELETE /api/transactions/:id`);
  console.log(`   GET  /api/analytics`);
  console.log(`   GET  /api/goals`);
  console.log(`   GET  /api/settings`);
});

export default app;