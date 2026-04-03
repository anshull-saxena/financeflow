# FinanceFlow - Personal Finance Management App

A modern, full-stack personal finance application with real-time data, MySQL database integration, and hybrid storage.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the server
cd server
node src/full-server.mjs

# Open in browser
http://localhost:3001
```

**That's it!** The app runs immediately with in-memory storage.

## ✨ Features

- 📊 **Dashboard** - Real-time financial overview with charts
- 💰 **Income Tracking** - Add, view, filter, and manage income
- 💸 **Expense Management** - Track expenses by category
- 📈 **Analytics** - Financial health score, trends, insights
- 🎯 **Goals** - Set and track savings goals
- ⚙️ **Settings** - Customize preferences
- 🔐 **Auth** - Login/Signup pages (demo credentials)

## 🗄️ Database Options

### Option 1: In-Memory (Default - No Setup)
Perfect for development and demos. Data resets on server restart.

### Option 2: MySQL (For Persistence)
Run the automatic setup script:
```bash
cd server
./setup-mysql.sh
```

See [`server/MYSQL-SETUP.md`](server/MYSQL-SETUP.md) for details.

## 📁 Project Structure

```
financeflow/
├── financeflow/          # Frontend HTML/JS/CSS
│   ├── dashboard/       # Main dashboard
│   ├── income_page/     # Income tracking
│   ├── expenses_page/   # Expense management
│   ├── reports_analytics/ # Analytics & charts
│   ├── settings/        # User settings
│   ├── auth/           # Login/Signup
│   └── shared/         # Shared utilities
├── server/             # Backend Express API
│   ├── src/
│   │   ├── full-server.mjs    # Main server
│   │   ├── data-access.mjs    # Hybrid data layer
│   │   └── db/               # Database layer
│   ├── migrations/     # SQL migrations
│   ├── setup-mysql.sh  # Auto setup script
│   └── *.md           # Documentation
└── README.md          # This file
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard` | GET | Dashboard data with stats |
| `/api/transactions` | GET | All transactions |
| `/api/transactions` | POST | Create transaction |
| `/api/transactions/:id` | DELETE | Delete transaction |
| `/api/analytics` | GET | Charts and insights |
| `/api/goals` | GET | Savings goals |
| `/api/settings` | GET/PUT | User settings |
| `/api/auth/login` | POST | User login |
| `/api/auth/signup` | POST | User registration |

## 🎨 Tech Stack

**Frontend:**
- Vanilla JavaScript
- Tailwind CSS (CDN)
- Chart.js for visualizations
- Material Icons

**Backend:**
- Node.js + Express
- MySQL2 (optional)
- dotenv for configuration

**Storage:**
- MySQL database (when configured)
- In-memory fallback (default)

## 🔑 Demo Credentials

```
Email: demo@financeflow.local
Password: demo123
```

## 📊 Key Features

### Dashboard
- Total income, expenses, balance
- Savings rate calculation
- Financial health score (0-100)
- Recent transactions
- Savings goals with progress

### Income/Expense Management
- Full CRUD operations
- Category filtering
- Search functionality
- Pagination support
- Real-time updates

### Analytics
- Weekly/Monthly trends
- Category breakdown
- Financial health insights
- Chart visualizations

### Settings
- Currency selection
- Monthly budget goals
- Notification preferences
- Dark mode toggle
- Two-factor auth (UI only)

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
cd server
node src/full-server.mjs

# Server runs on http://localhost:3001
```

## 🚢 Deployment

### With MySQL
1. Set up MySQL on server
2. Run `./setup-mysql.sh`
3. Configure `.env` file
4. Start server

### Without MySQL
1. Upload `server/` folder
2. Run `npm install`
3. Start with `node src/full-server.mjs`

Data persists in memory (resets on restart).

## 📖 Documentation

- [`SETUP-SUMMARY.md`](SETUP-SUMMARY.md) - Complete setup guide
- [`server/MYSQL-SETUP.md`](server/MYSQL-SETUP.md) - MySQL setup details
- [`server/README-MYSQL.md`](server/README-MYSQL.md) - MySQL quick reference

## 🔧 Configuration

Create `server/.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=financeflow
DB_PASSWORD=financeflow
DB_NAME=financeflow

PORT=3001
NODE_ENV=development
```

## 🐛 Troubleshooting

**Server won't start:**
- Check Node.js version (v14+)
- Verify port 3001 is available
- Check for syntax errors

**MySQL connection fails:**
- Verify MySQL is running
- Check credentials in `.env`
- Run `./setup-mysql.sh` again

**Data not persisting:**
- Check startup message for "📊 MySQL" or "💾 Memory"
- If in-memory mode, run setup script

## 📝 License

MIT License - Feel free to use for personal or commercial projects.

## 🤝 Contributing

This is a personal project, but suggestions welcome!

---

**Built with ❤️ for better personal finance management**
