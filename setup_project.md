# FinanceFlow — Production Setup Guide

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript, React 18
- **Backend**: Node.js + Express.js
- **Database**: MySQL 8.0+
- **Auth**: JWT (JSON Web Tokens)

---

## Quick Start (Development)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd financeflow

# 2. Serve the frontend (static HTML)
cd site/public
python3 -m http.server 3001
# Open http://localhost:3001
# Login: password = admin123
```

---

## Production Setup

### 1. Prerequisites
- Node.js 18+ and npm
- MySQL 8.0+ server
- A Linux server or cloud VM (AWS EC2, DigitalOcean, etc.)

### 2. Database Setup

```sql
-- Connect to MySQL
mysql -u root -p

-- Create database and user
CREATE DATABASE financeflow;
CREATE USER 'ffuser'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON financeflow.* TO 'ffuser'@'localhost';
FLUSH PRIVILEGES;
USE financeflow;

-- Create tables
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    icon VARCHAR(50) DEFAULT 'receipt'
);

CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT,
    type ENUM('income', 'expense') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description VARCHAR(255),
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(12,2) NOT NULL,
    saved_amount DECIMAL(12,2) DEFAULT 0,
    color VARCHAR(20) DEFAULT 'primary',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed default categories
INSERT INTO categories (name, type, icon) VALUES
('Salary', 'income', 'payments'),
('Freelance', 'income', 'work'),
('Investment', 'income', 'show_chart'),
('Food', 'expense', 'restaurant'),
('Housing', 'expense', 'home'),
('Transport', 'expense', 'flight'),
('Entertainment', 'expense', 'movie'),
('Technology', 'expense', 'shopping_bag');
```

### 3. Backend Setup

```bash
# Create server directory
mkdir server && cd server
npm init -y

# Install dependencies
npm install express mysql2 bcryptjs jsonwebtoken cors dotenv

# Create .env file
cat > .env << 'EOF'
DB_HOST=localhost
DB_USER=ffuser
DB_PASSWORD=your_strong_password
DB_NAME=financeflow
DB_PORT=3306
JWT_SECRET=your_random_64_char_secret_key_here
PORT=5000
EOF
```

Create `server/index.js`:
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('../site/public'));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

// Routes: POST /api/login, POST /api/register
// Routes: GET/POST/DELETE /api/transactions
// Routes: GET/POST/PUT/DELETE /api/goals
// (Implement based on the MySQL schema above)

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);
```

```bash
# Start the server
node server/index.js
```

### 4. Deploying to Production

```bash
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start server/index.js --name financeflow
pm2 save
pm2 startup  # auto-start on reboot

# Nginx reverse proxy (recommended)
sudo apt install nginx
```

Add to `/etc/nginx/sites-available/financeflow`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        root /path/to/site/public;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/financeflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## File Structure

```
financeflow/
├── site/public/          # Frontend (static HTML)
│   ├── index.html        # Login page
│   ├── dashboard.html    # Dashboard (interactive)
│   ├── income.html       # Income tracking
│   ├── expenses.html     # Expense tracking
│   └── settings.html     # Settings & profile
├── server/               # Backend (Node.js)
│   ├── index.js          # Express server
│   └── .env              # Environment variables
├── implementation.md     # Full implementation spec
└── setup_project.md      # This file
```

## Default Login
- **Email**: `admin`
- **Password**: `admin123`
