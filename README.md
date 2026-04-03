# FinanceFlow - Personal Finance Manager

A modern personal finance management application with real-time tracking, analytics, and budget management.

## Features

✅ **Dashboard** - Real-time financial overview with Chart.js visualizations
✅ **Income Tracking** - Add, view, and manage income sources
✅ **Expense Tracking** - Track expenses by category with search and filters
✅ **Analytics** - Financial health score, trends, and category breakdowns
✅ **Settings** - User preferences, currency, budget goals, dark mode
✅ **Authentication** - Login and signup pages

## Quick Start

### 1. Start the Server

```bash
cd server
npm install
node src/full-server.mjs
```

Server will run on **http://localhost:3001**

### 2. Access the Application

Open your browser and go to:

- **Dashboard**: http://localhost:3001/
- **Login**: http://localhost:3001/login
- **Signup**: http://localhost:3001/signup

### Demo Credentials

```
Email: demo@financeflow.local
Password: demo123
```

## Project Structure

```
financeflow/
├── financeflow/          # Frontend HTML pages
│   ├── auth/            # Login/Signup pages
│   ├── dashboard/       # Main dashboard
│   ├── income_page/     # Income tracking
│   ├── expenses_page/   # Expense tracking
│   ├── reports_analytics/  # Analytics & charts
│   ├── settings/        # User settings
│   └── shared/          # Shared JavaScript utilities
│       ├── financeflow.js  # API client
│       ├── darkmode.js     # Dark mode manager
│       └── toast.js        # Toast notifications
└── server/              # Backend API server
    └── src/
        └── full-server.mjs  # Express API server
```

## Available Pages

- `/` - Dashboard (requires navigation to login first)
- `/login` - Login page
- `/signup` - Signup page
- `/income` - Income tracking
- `/expenses` - Expense tracking
- `/analytics` - Financial analytics
- `/settings` - User settings

## API Endpoints

- `GET /api/dashboard` - Get dashboard data
- `GET /api/transactions` - Get transactions (supports ?type=income/expense)
- `POST /api/transactions` - Create transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/analytics` - Get analytics data
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings
- `POST /api/auth/login` - Login
- `POST /api/auth/signup` - Signup

## Technologies

- **Frontend**: HTML, Tailwind CSS, Vanilla JavaScript, Chart.js
- **Backend**: Node.js, Express.js
- **Data**: In-memory storage (8 demo transactions)

## Features in Detail

### Dark Mode
- Toggle in dashboard header
- Persists across pages via localStorage
- Settings page integration

### Toast Notifications
- Success/error messages for actions
- Auto-dismiss after 3 seconds

### Real-time Data
- All pages fetch from API
- Add/delete transactions instantly
- Charts update with real data

---

**Built with ❤️ for personal finance tracking**
