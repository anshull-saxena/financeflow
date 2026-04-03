import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3001', 'http://127.0.0.1:3001'];

app.use(cors({
  origin(origin, cb) {
    // Allow requests with no origin (mobile apps, curl, same-origin requests)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

// Serve static frontend files from site/public
app.use(express.static(path.join(__dirname, '../../site/public')));

// In-memory storage (no hardcoded demo data)
const users = new Map();      // userId -> { id, name, email, passwordHash, settings }
const sessions = new Map();   // token  -> userId
const userTransactions = new Map(); // userId -> transaction[]
const userGoals = new Map();        // userId -> goal[]

function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  const token = auth.slice(7);
  const userId = sessions.get(token);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
  req.userId = userId;
  next();
}

function getUserTransactions(userId) {
  if (!userTransactions.has(userId)) userTransactions.set(userId, []);
  return userTransactions.get(userId);
}

function getUserGoals(userId) {
  if (!userGoals.has(userId)) userGoals.set(userId, []);
  return userGoals.get(userId);
}

function calculateStats(txs) {
  const totalIncome = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

  const categoryTotals = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  return { totalIncome, totalExpenses, balance, savingsRate, categoryBreakdown };
}

// API: Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'FinanceFlow API' });
});

// API: Auth - Login
app.post('/api/auth/login', authLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  let foundUser = null;
  for (const u of users.values()) {
    if (u.email.toLowerCase() === email.toLowerCase()) {
      foundUser = u;
      break;
    }
  }

  if (!foundUser || !verifyPassword(password, foundUser.passwordHash)) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  const token = randomUUID();
  sessions.set(token, foundUser.id);

  res.json({
    success: true,
    data: {
      token,
      user: { id: foundUser.id, name: foundUser.name, email: foundUser.email }
    }
  });
});

// API: Auth - Signup
app.post('/api/auth/signup', authLimiter, (req, res) => {
  const { name, email, password, currency = 'INR', monthlyGoal = 0 } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
  }

  for (const u of users.values()) {
    if (u.email.toLowerCase() === email.toLowerCase()) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }
  }

  const id = randomUUID();
  const newUser = {
    id,
    name,
    email,
    passwordHash: hashPassword(password),
    settings: {
      currency,
      monthlyGoal: parseFloat(monthlyGoal) || 0,
      emailNotif: true,
      darkMode: true,
      twoFactor: false
    }
  };
  users.set(id, newUser);
  userTransactions.set(id, []);
  userGoals.set(id, []);

  const token = randomUUID();
  sessions.set(token, id);

  res.status(201).json({
    success: true,
    data: { token, user: { id, name, email } }
  });
});

// API: Auth - Logout
app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization.slice(7);
  sessions.delete(token);
  res.json({ success: true, message: 'Logged out successfully' });
});

// API: Auth - Change password
app.put('/api/auth/password', requireAuth, authLimiter, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const u = users.get(req.userId);

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Current password and new password are required' });
  }
  if (!verifyPassword(currentPassword, u.passwordHash)) {
    return res.status(401).json({ success: false, error: 'Current password is incorrect' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
  }

  u.passwordHash = hashPassword(newPassword);
  res.json({ success: true, message: 'Password updated successfully' });
});

// API: Dashboard
app.get('/api/dashboard', requireAuth, (req, res) => {
  const u = users.get(req.userId);
  const txs = getUserTransactions(req.userId);
  const goals = getUserGoals(req.userId);
  const stats = calculateStats(txs);

  res.json({
    success: true,
    data: {
      user: { id: u.id, name: u.name, email: u.email },
      stats: {
        ...stats,
        recentTransactions: txs
          .slice()
          .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
          .slice(0, 8)
      },
      goals: goals.map(g => ({
        ...g,
        progress: g.targetAmount > 0 ? Math.round((g.savedAmount / g.targetAmount) * 100) : 0
      }))
    }
  });
});

// API: Get all transactions
app.get('/api/transactions', requireAuth, (req, res) => {
  const { type, category, search, limit = 100, offset = 0 } = req.query;

  let filtered = [...getUserTransactions(req.userId)];

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
    data: { transactions: results, total, limit: parseInt(limit), offset: parseInt(offset) }
  });
});

// API: Create transaction
app.post('/api/transactions', requireAuth, (req, res) => {
  const { type, description, category, amount, currency, occurredAt } = req.body;

  if (!type || !description || !category || !amount) {
    return res.status(400).json({ success: false, error: 'Missing required fields: type, description, category, amount' });
  }

  const u = users.get(req.userId);
  const txs = getUserTransactions(req.userId);
  const newTx = {
    id: randomUUID(),
    userId: req.userId,
    type,
    description,
    category,
    amount: parseFloat(amount),
    currency: currency || u?.settings?.currency || 'INR',
    occurredAt: occurredAt || new Date().toISOString()
  };
  txs.push(newTx);

  res.status(201).json({ success: true, data: newTx });
});

// API: Delete transaction
app.delete('/api/transactions/:id', requireAuth, (req, res) => {
  const txs = getUserTransactions(req.userId);
  const index = txs.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: 'Transaction not found' });
  txs.splice(index, 1);
  res.json({ success: true, message: 'Transaction deleted' });
});

// API: Get goals
app.get('/api/goals', requireAuth, (req, res) => {
  const goals = getUserGoals(req.userId);
  res.json({
    success: true,
    data: goals.map(g => ({
      ...g,
      progress: g.targetAmount > 0 ? Math.round((g.savedAmount / g.targetAmount) * 100) : 0
    }))
  });
});

// API: Create goal
app.post('/api/goals', requireAuth, (req, res) => {
  const { name, targetAmount, savedAmount = 0, currency } = req.body;
  if (!name || !targetAmount) {
    return res.status(400).json({ success: false, error: 'Missing required fields: name, targetAmount' });
  }

  const u = users.get(req.userId);
  const goals = getUserGoals(req.userId);
  const newGoal = {
    id: randomUUID(),
    userId: req.userId,
    name,
    targetAmount: parseFloat(targetAmount),
    savedAmount: parseFloat(savedAmount),
    currency: currency || u?.settings?.currency || 'INR'
  };
  goals.push(newGoal);

  res.status(201).json({ success: true, data: newGoal });
});

// API: Update goal
app.put('/api/goals/:id', requireAuth, (req, res) => {
  const goals = getUserGoals(req.userId);
  const index = goals.findIndex(g => g.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: 'Goal not found' });
  goals[index] = { ...goals[index], ...req.body, id: goals[index].id, userId: req.userId };
  res.json({ success: true, data: goals[index] });
});

// API: Delete goal
app.delete('/api/goals/:id', requireAuth, (req, res) => {
  const goals = getUserGoals(req.userId);
  const index = goals.findIndex(g => g.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: 'Goal not found' });
  goals.splice(index, 1);
  res.json({ success: true, message: 'Goal deleted' });
});

// API: Get settings
app.get('/api/settings', requireAuth, (req, res) => {
  const u = users.get(req.userId);
  res.json({ success: true, data: { id: u.id, name: u.name, email: u.email, settings: u.settings } });
});

// API: Update settings
app.put('/api/settings', requireAuth, (req, res) => {
  const u = users.get(req.userId);
  const { name, email, settings } = req.body;
  if (name) u.name = name;
  if (email) u.email = email;
  if (settings) u.settings = { ...u.settings, ...settings };
  res.json({ success: true, data: { id: u.id, name: u.name, email: u.email, settings: u.settings } });
});

// API: Analytics
app.get('/api/analytics', requireAuth, (req, res) => {
  const txs = getUserTransactions(req.userId);
  const stats = calculateStats(txs);
  res.json({
    success: true,
    data: { ...stats, topExpenseCategories: stats.categoryBreakdown.slice(0, 5) }
  });
});

// API: Categories (public)
app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    data: {
      income: ['Salary', 'Freelance', 'Investment', 'Business', 'Other'],
      expense: ['Housing', 'Food', 'Transport', 'Technology', 'Entertainment', 'Healthcare', 'Shopping', 'Education', 'Other']
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// 404 for unknown API routes
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
  }
  // All other routes serve the frontend
  res.sendFile(path.join(__dirname, '../../site/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 FinanceFlow Server running on http://localhost:${PORT}`);
  console.log(`\n📡 API Endpoints:`);
  console.log(`   POST   /api/auth/signup`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   POST   /api/auth/logout`);
  console.log(`   PUT    /api/auth/password`);
  console.log(`   GET    /api/dashboard`);
  console.log(`   GET    /api/transactions`);
  console.log(`   POST   /api/transactions`);
  console.log(`   DELETE /api/transactions/:id`);
  console.log(`   GET    /api/goals`);
  console.log(`   POST   /api/goals`);
  console.log(`   PUT    /api/goals/:id`);
  console.log(`   DELETE /api/goals/:id`);
  console.log(`   GET    /api/settings`);
  console.log(`   PUT    /api/settings`);
  console.log(`   GET    /api/analytics`);
  console.log(`   GET    /api/categories`);
});

export default app;