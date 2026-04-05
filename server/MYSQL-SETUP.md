# MySQL Setup for FinanceFlow

This guide explains how to set up MySQL database for FinanceFlow on any device.

## Quick Setup (Recommended)

### Option A: Cloud MySQL (Vercel-friendly)

Use any managed MySQL provider (PlanetScale, Aiven, AWS RDS, etc.) and set:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/financeflow
DB_SSL=true
```

Then start/redeploy the app. Migrations are applied automatically at startup.

### Option B: Local MySQL

Run the automatic setup script:

```bash
cd server
./setup-mysql.sh
```

The script will:
1. ✅ Check if MySQL is installed
2. ✅ Check if MySQL server is running
3. ✅ Create database and user
4. ✅ Run migrations to create tables
5. ✅ Create .env configuration file

## Manual Setup

If you prefer manual setup or the script fails:

### 1. Install MySQL

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install mysql-server
sudo service mysql start
```

**Windows:**
- Download installer from https://dev.mysql.com/downloads/installer/
- Run installer and follow prompts
- Start MySQL service from Services

### 2. Create Database and User

```bash
mysql -uroot -p
```

```sql
CREATE DATABASE financeflow;
CREATE USER 'financeflow'@'localhost' IDENTIFIED BY 'financeflow';
GRANT ALL PRIVILEGES ON financeflow.* TO 'financeflow'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Run Migrations

```bash
cd server
mysql -ufinanceflow -pfinanceflow financeflow < migrations/001_init.sql
```

### 4. Create .env File

```bash
cd server
cp .env.example .env
```

Edit `.env` if needed (default values should work):
```env
DATABASE_URL=
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true

DB_HOST=localhost
DB_PORT=3306
DB_USER=financeflow
DB_PASSWORD=financeflow
DB_NAME=financeflow

PORT=3001
NODE_ENV=development
```

### 5. Seed Demo Data (Optional)

```bash
mysql -ufinanceflow -pfinanceflow financeflow
```

```sql
-- Insert demo user
INSERT INTO users (id, name, email) VALUES ('1', 'Demo User', 'demo@financeflow.local');

-- Insert demo transactions
INSERT INTO transactions (user_id, type, description, category, amount, currency, occurred_at) VALUES
('1', 'expense', 'Apple Store', 'Technology', 1299.00, 'INR', '2023-10-24 14:45:00'),
('1', 'income', 'Monthly Salary', 'Salary', 12450.00, 'INR', '2023-10-01 09:00:00'),
('1', 'expense', 'Lumière Dining', 'Food', 240.00, 'INR', '2023-09-30 20:15:00'),
('1', 'expense', 'Electric Utility', 'Housing', 112.00, 'INR', '2023-09-21 10:30:00'),
('1', 'expense', 'Skyline Airways', 'Transport', 850.00, 'INR', '2023-09-28 11:30:00'),
('1', 'expense', 'Grocery Shopping', 'Food', 450.00, 'INR', '2023-10-15 10:30:00'),
('1', 'expense', 'Gas Station', 'Transport', 120.00, 'INR', '2023-10-18 08:15:00'),
('1', 'income', 'Freelance Project', 'Income', 5000.00, 'INR', '2023-10-10 14:00:00');

-- Insert demo goals
INSERT INTO goals (user_id, name, target_amount, saved_amount, currency) VALUES
('1', 'New Porsche 911', 160000.00, 104000.00, 'INR'),
('1', 'Tokyo Trip', 12000.00, 11040.00, 'INR');

-- Insert user settings
INSERT INTO user_settings (user_id, currency, monthly_goal, email_notif, dark_mode, two_factor) VALUES
('1', 'INR', 10000.00, true, true, false);

EXIT;
```

## Verify Setup

```bash
cd server
node src/full-server.mjs
```

You should see:
```
📊 Using MySQL database for data persistence
🚀 FinanceFlow Server Started
```

## Troubleshooting

### MySQL not running
```bash
# macOS
brew services start mysql

# Ubuntu
sudo service mysql start

# Check status
mysqladmin ping
```

### Can't connect to MySQL
- Check credentials in `.env`
- Verify MySQL is running: `mysqladmin ping`
- Check user privileges: `SHOW GRANTS FOR 'financeflow'@'localhost';`

### Port 3306 already in use
- Change `DB_PORT` in `.env` to another port
- Or stop the conflicting service

## Fallback Mode

If MySQL setup fails, FinanceFlow automatically uses in-memory storage:
- ✅ App works immediately without database
- ⚠️  Data is lost on server restart
- 🔄 Can switch to MySQL anytime by running setup script

## Production Recommendations

For production deployment:

1. **Use strong passwords**: Change default `financeflow` password
2. **Enable SSL**: Configure MySQL with SSL certificates
3. **Regular backups**: Set up automated database backups
4. **Connection pooling**: Already configured (10 connections)
5. **Environment variables**: Never commit `.env` to version control

## Database Schema

Tables created by migrations:

- `users` - User accounts
- `user_settings` - User preferences and settings
- `transactions` - Income and expense transactions
- `goals` - Savings goals

See `migrations/001_init.sql` for complete schema.
