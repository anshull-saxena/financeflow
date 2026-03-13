# Personal Finance Tracker - Implementation Plan

## 1. Project Overview

### Project Name
**FinanceFlow** - Personal Finance Tracker

### Project Type
Full-stack Web Application

### Core Functionality
A comprehensive personal finance management system that allows users to track their income (salary) and expenditures across multiple categories, visualize spending patterns through interactive charts, and maintain better control over their financial health.

### Target Users
- Working professionals managing monthly budgets
- Students tracking expenses
- Anyone wanting to gain insights into their spending habits

---

## 2. Technology Stack

### Frontend
- **Languages**: HTML, CSS, JavaScript
- **Framework**: React 18 (Create React App / Vite)
- **Styling**: Vanilla CSS with custom design system
- **Charts**: Chart.js (via react-chartjs-2)
- **State Management**: React Context + useReducer
- **Forms**: Native React controlled components
- **Icons**: Material Symbols (Google Fonts)

### Backend
- **Runtime**: Node.js with Express.js
- **Authentication**: JSON Web Tokens (JWT) with bcrypt
- **Database**: MySQL (via mysql2 driver)
- **Validation**: Custom JS validation helpers

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint
- **Bundler**: Vite / Create React App

---

## 3. Database Schema

### User Table
```
users {
  id              UUID PRIMARY KEY
  email           VARCHAR(255) UNIQUE NOT NULL
  password        VARCHAR(255) NOT NULL (hashed)
  name            VARCHAR(100)
  createdAt       TIMESTAMP DEFAULT NOW()
  updatedAt       TIMESTAMP DEFAULT NOW()
}
```

### Income/Salary Table
```
incomes {
  id              UUID PRIMARY KEY
  userId          UUID FOREIGN KEY → users.id
  amount          DECIMAL(12,2) NOT NULL
  description     VARCHAR(255)
  date            DATE NOT NULL
  createdAt       TIMESTAMP DEFAULT NOW()
  updatedAt       TIMESTAMP DEFAULT NOW()
}
```

### Expense Categories Table (Pre-defined)
```
categories {
  id              UUID PRIMARY KEY
  name            VARCHAR(50) NOT NULL
  icon            VARCHAR(50)
  color           VARCHAR(20)
  isDefault       BOOLEAN DEFAULT TRUE
}
```

### Expenses Table
```
expenses {
  id              UUID PRIMARY KEY
  userId          UUID FOREIGN KEY → users.id
  categoryId      UUID FOREIGN KEY → categories.id
  amount          DECIMAL(12,2) NOT NULL
  description     VARCHAR(255)
  date            DATE NOT NULL
  createdAt       TIMESTAMP DEFAULT NOW()
  updatedAt       TIMESTAMP DEFAULT NOW()
}
```

### Monthly Budget Table (Optional Enhancement)
```
budgets {
  id              UUID PRIMARY KEY
  userId          UUID FOREIGN KEY → users.id
  categoryId      UUID FOREIGN KEY → categories.id
  amount          DECIMAL(12,2) NOT NULL
  month           INTEGER (1-12)
  year            INTEGER
  createdAt       TIMESTAMP DEFAULT NOW()
  updatedAt       TIMESTAMP DEFAULT NOW()
}
```

---

## 4. API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - User login (returns JWT/session)
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Income Management
- `GET /api/incomes` - Get all incomes for current user
- `POST /api/incomes` - Create new income entry
- `PUT /api/incomes/[id]` - Update income entry
- `DELETE /api/incomes/[id]` - Delete income entry
- `GET /api/incomes/summary` - Get income summary by month

### Expense Management
- `GET /api/expenses` - Get all expenses for current user
- `POST /api/expenses` - Create new expense entry
- `PUT /api/expenses/[id]` - Update expense entry
- `DELETE /api/expenses/[id]` - Delete expense entry
- `GET /api/expenses/summary` - Get expense summary by category/month

### Dashboard Data
- `GET /api/dashboard/overview` - Get financial overview (balance, stats)
- `GET /api/dashboard/chart-data` - Get data for visualizations

### Categories
- `GET /api/categories` - Get all expense categories

---

## 5. UI/UX Design Specification

### Design System

#### Color Palette
- **Primary**: #0D9488 (Teal-600) - Main actions, highlights
- **Primary Light**: #14B8A6 (Teal-500) - Hover states
- **Primary Dark**: #0F766E (Teal-700) - Active states
- **Secondary**: #6366F1 (Indigo-500) - Charts accent
- **Background**: #F8FAFC (Slate-50) - Page background
- **Surface**: #FFFFFF (White) - Cards, modals
- **Text Primary**: #1E293B (Slate-800)
- **Text Secondary**: #64748B (Slate-500)
- **Success**: #10B981 (Emerald-500) - Positive balance
- **Warning**: #F59E0B (Amber-500) - Near limit
- **Danger**: #EF4444 (Red-500) - Overspent/negative

#### Typography
- **Font Family**: Inter (Google Fonts) - Clean, modern
- **Headings**: 
  - H1: 32px, font-weight: 700
  - H2: 24px, font-weight: 600
  - H3: 20px, font-weight: 600
  - H4: 16px, font-weight: 600
- **Body**: 14px, font-weight: 400
- **Small**: 12px, font-weight: 400
- **Line Height**: 1.5

#### Spacing System
- Base unit: 4px
- XS: 4px, SM: 8px, MD: 16px, LG: 24px, XL: 32px, 2XL: 48px

#### Border Radius
- Small: 6px (buttons, inputs)
- Medium: 8px (cards)
- Large: 12px (modals, panels)
- Full: 9999px (avatars, badges)

#### Shadows
- Small: 0 1px 2px rgba(0,0,0,0.05)
- Medium: 0 4px 6px rgba(0,0,0,0.07)
- Large: 0 10px 15px rgba(0,0,0,0.1)

### Layout Structure

#### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

#### Global Layout
```
┌─────────────────────────────────────────────────┐
│  Header (Logo + User Menu)                      │
├───────────┬─────────────────────────────────────┤
│           │                                     │
│  Sidebar  │       Main Content Area             │
│  (Nav)    │                                     │
│           │                                     │
└───────────┴─────────────────────────────────────┘
```

### Page Designs

#### 1. Login Page
- Centered card on gradient background
- Logo at top
- Email input with icon
- Password input with show/hide toggle
- "Remember me" checkbox
- Login button (primary)
- "Forgot password?" link
- "Sign up" link for new users
- Social login buttons (optional)

#### 2. Register Page
- Similar to login
- Additional fields: Name, Confirm Password
- Terms acceptance checkbox

#### 3. Home/Dashboard Page
- Welcome message with user name
- Quick stats cards row:
  - Total Income (this month)
  - Total Expenses (this month)
  - Current Balance
  - Savings Rate %
- Quick action buttons: Add Income, Add Expense
- Recent transactions list (last 5)
- Monthly comparison chart (bar chart)
- Category breakdown (mini pie chart)

#### 4. Income Page
- Page header with "Add Income" button
- Filter by date range
- Income list table with:
  - Date
  - Description
  - Amount
  - Actions (edit/delete)
- Monthly summary card

#### 5. Expense Page
- Page header with "Add Expense" button
- Filter by category and date range
- Expense list table with:
  - Date
  - Category (with icon)
  - Description
  - Amount
  - Actions (edit/delete)
- Category breakdown sidebar

#### 6. Add/Edit Transaction Modal
- Transaction type toggle (Income/Expense)
- Amount input (large, prominent)
- Category dropdown (for expenses)
- Description input
- Date picker (defaults to today)
- Save and Cancel buttons

#### 7. Reports/Analytics Page
- Date range selector
- Income vs Expense line chart (monthly)
- Expense breakdown pie chart
- Category comparison bar chart
- Top spending categories list
- Monthly trends table

#### 8. Settings Page
- Profile section (name, email)
- Change password
- Category management (add custom categories)
- Data export (CSV)
- Theme toggle (light/dark) - future
- Delete account

### Component States

#### Buttons
- Default: Primary color background
- Hover: Lighter shade
- Active: Darker shade
- Disabled: Gray, 50% opacity, no cursor

#### Inputs
- Default: Gray border
- Focus: Primary color border, light shadow
- Error: Red border, error message below
- Success: Green border (optional)

#### Cards
- Default: White background, subtle shadow
- Hover: Elevated shadow (for interactive cards)

### Animations
- Page transitions: Fade in (200ms)
- Modal: Scale up from 95% to 100% (200ms)
- Button hover: Scale 1.02 (150ms)
- Chart animations: Progressive reveal (800ms)
- Loading states: Skeleton screens

---

## 6. Feature Implementation Details

### Authentication System
1. **Registration Flow**
   - Validate email format
   - Validate password (min 8 chars, 1 number)
   - Hash password with bcrypt
   - Create user record
   - Send welcome email (optional)

2. **Login Flow**
   - Find user by email
   - Compare password hash
   - Create session with NextAuth
   - Redirect to dashboard

3. **Session Management**
   - JWT stored in HTTP-only cookie
   - 7-day expiry
   - Auto-refresh on activity

### Income Management
1. **Add Income**
   - Form validation (amount > 0)
   - Insert into incomes table
   - Update user's balance
   - Show success toast

2. **Edit Income**
   - Load existing data into form
   - Update record on save
   - Recalculate related totals

3. **Delete Income**
   - Confirmation dialog
   - Soft delete or hard delete
   - Update balance

### Expense Management
1. **Add Expense**
   - Select category from dropdown
   - Enter amount and description
   - Assign date
   - Insert into expenses table

2. **Edit Expense**
   - Same as income edit

3. **Delete Expense**
   - Same as income delete

### Dashboard Analytics
1. **Balance Calculation**
   - Total Income - Total Expenses = Balance
   - Calculate by month

2. **Savings Rate**
   - (Income - Expenses) / Income * 100

3. **Chart Data Preparation**
   - Group by month for line chart
   - Group by category for pie chart

### Data Validation Rules
- Amount: Positive number, max 2 decimal places
- Description: Max 255 characters
- Date: Cannot be future date (optional)
- Category: Required for expenses

---

## 7. Project Structure

```
financeflow/
├── public/
│   └── images/                # Static images
├── src/
│   ├── pages/
│   │   ├── Login.jsx           # Login page
│   │   ├── Register.jsx        # Register page
│   │   ├── Dashboard.jsx       # Dashboard overview
│   │   ├── Income.jsx          # Income management
│   │   ├── Expenses.jsx        # Expense tracking
│   │   ├── Reports.jsx         # Reports & analytics
│   │   └── Settings.jsx        # User settings
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Table.jsx
│   │   │   └── Chart.jsx
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx
│   │   │   └── Navbar.jsx
│   │   └── forms/
│   │       ├── IncomeForm.jsx
│   │       └── ExpenseForm.jsx
│   ├── context/
│   │   └── AuthContext.jsx     # Auth state management
│   ├── services/
│   │   ├── api.js              # Axios/fetch API helpers
│   │   └── auth.js             # Auth service
│   ├── utils/
│   │   └── helpers.js          # Utility functions
│   ├── styles/
│   │   ├── globals.css         # Global styles
│   │   ├── login.css
│   │   ├── dashboard.css
│   │   └── components.css
│   ├── App.jsx                 # Main app with routing
│   └── index.js                # Entry point
├── server/
│   ├── index.js                # Express server entry
│   ├── config/
│   │   └── db.js               # MySQL connection config
│   ├── routes/
│   │   ├── auth.js             # Auth routes
│   │   ├── incomes.js          # Income API routes
│   │   ├── expenses.js         # Expense API routes
│   │   └── dashboard.js        # Dashboard data routes
│   ├── middleware/
│   │   └── auth.js             # JWT auth middleware
│   └── models/
│       └── schema.sql          # MySQL schema
├── .env                        # Environment variables
├── .eslintrc.json
└── package.json
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. Initialize React project (Vite or CRA)
2. Set up CSS design system with custom styles
3. Configure MySQL database and connection
4. Create database schema (SQL)
5. Set up Express.js backend with JWT authentication

### Phase 2: Core Features (Week 2)
1. Build login and register pages
2. Create sidebar navigation
3. Implement income CRUD operations
4. Implement expense CRUD operations
5. Add form validation

### Phase 3: Dashboard & Analytics (Week 3)
1. Build dashboard overview page
2. Implement chart components (Chart.js)
3. Create reports/analytics page
4. Add filtering and date ranges

### Phase 4: Polish & Enhancement (Week 4)
1. Add loading states and error handling
2. Implement responsive design
3. Add toast notifications
4. Create settings page
5. Add data export functionality
6. Test and fix bugs

---

## 9. Environment Variables

```env
# Database (MySQL)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password-here
DB_NAME=financeflow
DB_PORT=3306

# JWT
JWT_SECRET="your-jwt-secret-key-here"

# Server
PORT=5000
REACT_APP_API_URL="http://localhost:5000/api"
```

---

## 10. Dependencies (package.json)

### Frontend
```json
{
  "dependencies": {
    "react": "18.x",
    "react-dom": "18.x",
    "react-router-dom": "6.x",
    "chart.js": "4.x",
    "react-chartjs-2": "5.x",
    "axios": "1.x",
    "date-fns": "3.x"
  },
  "devDependencies": {
    "eslint": "8.x",
    "vite": "5.x",
    "@vitejs/plugin-react": "4.x"
  }
}
```

### Backend
```json
{
  "dependencies": {
    "express": "4.x",
    "mysql2": "3.x",
    "bcryptjs": "2.x",
    "jsonwebtoken": "9.x",
    "cors": "2.x",
    "dotenv": "16.x"
  },
  "devDependencies": {
    "nodemon": "3.x"
  }
}
```

---

## 11. Testing Checklist

### Authentication
- [ ] User can register with valid credentials
- [ ] User cannot register with existing email
- [ ] User can login with correct credentials
- [ ] User sees error with wrong credentials
- [ ] Session persists on page refresh
- [ ] User can logout successfully

### Income Management
- [ ] User can add new income
- [ ] User can edit existing income
- [ ] User can delete income with confirmation
- [ ] Income list displays correctly
- [ ] Filters work correctly

### Expense Management
- [ ] User can add new expense with category
- [ ] User can edit existing expense
- [ ] User can delete expense with confirmation
- [ ] Category icons display correctly
- [ ] Filters work correctly

### Dashboard
- [ ] Balance calculates correctly
- [ ] Charts render with correct data
- [ ] Quick stats are accurate
- [ ] Recent transactions show latest entries

### Reports
- [ ] Date range filter works
- [ ] Charts update with filtered data
- [ ] Category breakdown is accurate

### Responsive Design
- [ ] Layout works on mobile
- [ ] Navigation collapses on mobile
- [ ] Tables scroll horizontally on small screens

---

## 12. Future Enhancements (Post-MVP)

1. **Budget Alerts** - Notify when approaching budget limits
2. **Recurring Transactions** - Automate recurring income/expenses
3. **Multi-currency Support** - Handle different currencies
4. **Data Import** - Import from CSV/bank exports
5. **Dark Mode** - Theme switching
6. **PWA Support** - Install as mobile app
7. **Data Visualization** - More advanced charts and insights
8. **Goals** - Savings goals tracking
9. **Bill Reminders** - Upcoming payment reminders

---

## 13. Security Considerations

1. **Password Security**
   - Hash passwords with bcrypt (cost factor 12)
   - Never store plain text passwords

2. **Session Security**
   - Use HTTP-only cookies
   - Implement CSRF protection
   - Set appropriate cookie expiry

3. **Input Validation**
   - Validate all inputs on client and server
   - Sanitize against SQL injection (Prisma handles this)
   - Sanitize against XSS (React handles this)

4. **API Security**
   - Implement rate limiting
   - Require authentication for all data endpoints
   - Return appropriate HTTP status codes

5. **Data Privacy**
   - Don't expose sensitive data in responses
   - Implement proper error handling (don't leak stack traces)

---

This implementation plan provides a complete roadmap to build your personal finance tracker from the basic concept to a fully functional production application.
