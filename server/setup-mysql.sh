#!/bin/bash

# FinanceFlow MySQL Automatic Setup Script
# This script sets up MySQL database for FinanceFlow on any device

echo "🚀 FinanceFlow MySQL Setup"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default configuration
DB_NAME="financeflow"
DB_USER="financeflow"
DB_PASSWORD="financeflow"
DB_HOST="localhost"
DB_PORT="3306"

# Check if MySQL is installed
echo "🔍 Checking MySQL installation..."
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}❌ MySQL not found!${NC}"
    echo ""
    echo "Please install MySQL first:"
    echo "  • macOS:   brew install mysql"
    echo "  • Ubuntu:  sudo apt-get install mysql-server"
    echo "  • Windows: Download from https://dev.mysql.com/downloads/installer/"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ MySQL found${NC}"
echo ""

# Check if MySQL server is running
echo "🔍 Checking if MySQL server is running..."
if ! mysqladmin ping -h"$DB_HOST" --silent 2>/dev/null; then
    echo -e "${YELLOW}⚠️  MySQL server is not running${NC}"
    echo ""
    echo "Please start MySQL server:"
    echo "  • macOS:   brew services start mysql"
    echo "  • Ubuntu:  sudo service mysql start"
    echo "  • Windows: Start MySQL from Services"
    echo ""
    read -p "Press Enter after starting MySQL server..."
fi

echo -e "${GREEN}✅ MySQL server is running${NC}"
echo ""

# Ask for root password
echo "📝 MySQL root password is needed to create database and user"
read -sp "Enter MySQL root password (press Enter if none): " ROOT_PASSWORD
echo ""
echo ""

# Create database and user
echo "🔧 Setting up database..."

mysql -h"$DB_HOST" -uroot -p"$ROOT_PASSWORD" << MYSQL_SCRIPT 2>/dev/null
-- Create database
CREATE DATABASE IF NOT EXISTS $DB_NAME;

-- Create user
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED BY '$DB_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';

FLUSH PRIVILEGES;

SELECT 'Database and user created successfully' AS Status;
MYSQL_SCRIPT

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database created: $DB_NAME${NC}"
    echo -e "${GREEN}✅ User created: $DB_USER${NC}"
else
    echo -e "${RED}❌ Failed to create database${NC}"
    echo "Please check your root password and try again"
    exit 1
fi
echo ""

# Run migrations
echo "📋 Running database migrations..."
mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < migrations/001_init.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migrations completed${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi
echo ""

# Create .env file
echo "📝 Creating .env file..."
cat > .env << ENVEOF
# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# Server Configuration
PORT=3001
NODE_ENV=development
ENVEOF

echo -e "${GREEN}✅ .env file created${NC}"
echo ""

# Seed demo data (optional)
echo "🌱 Do you want to seed demo data? (y/n)"
read -p "> " SEED_DATA

if [ "$SEED_DATA" = "y" ] || [ "$SEED_DATA" = "Y" ]; then
    echo "Seeding demo data..."
    
    mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" << SEED_SCRIPT
-- Insert demo user
INSERT INTO users (id, name, email) VALUES ('1', 'Demo User', 'demo@financeflow.local')
ON DUPLICATE KEY UPDATE name='Demo User';

-- Insert demo transactions
INSERT INTO transactions (user_id, type, description, category, amount, currency, occurred_at) VALUES
('1', 'expense', 'Apple Store', 'Technology', 1299.00, 'INR', '2023-10-24 14:45:00'),
('1', 'income', 'Monthly Salary', 'Salary', 12450.00, 'INR', '2023-10-01 09:00:00'),
('1', 'expense', 'Lumière Dining', 'Food', 240.00, 'INR', '2023-09-30 20:15:00'),
('1', 'expense', 'Electric Utility', 'Housing', 112.00, 'INR', '2023-09-21 10:30:00'),
('1', 'expense', 'Skyline Airways', 'Transport', 850.00, 'INR', '2023-09-28 11:30:00'),
('1', 'expense', 'Grocery Shopping', 'Food', 450.00, 'INR', '2023-10-15 10:30:00'),
('1', 'expense', 'Gas Station', 'Transport', 120.00, 'INR', '2023-10-18 08:15:00'),
('1', 'income', 'Freelance Project', 'Income', 5000.00, 'INR', '2023-10-10 14:00:00')
ON DUPLICATE KEY UPDATE description=description;

-- Insert demo goals
INSERT INTO goals (user_id, name, target_amount, saved_amount, currency) VALUES
('1', 'New Porsche 911', 160000.00, 104000.00, 'INR'),
('1', 'Tokyo Trip', 12000.00, 11040.00, 'INR')
ON DUPLICATE KEY UPDATE name=name;

-- Insert user settings
INSERT INTO user_settings (user_id, currency, monthly_goal, email_notif, dark_mode, two_factor) VALUES
('1', 'INR', 10000.00, true, true, false)
ON DUPLICATE KEY UPDATE currency='INR';
SEED_SCRIPT

    echo -e "${GREEN}✅ Demo data seeded${NC}"
fi
echo ""

# Success message
echo "═══════════════════════════════════════"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "═══════════════════════════════════════"
echo ""
echo "Database Details:"
echo "  • Database: $DB_NAME"
echo "  • User: $DB_USER"
echo "  • Password: $DB_PASSWORD"
echo "  • Host: $DB_HOST"
echo "  • Port: $DB_PORT"
echo ""
echo "Next steps:"
echo "  1. Start the server: node src/full-server.mjs"
echo "  2. Open http://localhost:3001/"
echo ""
echo "The app will now use MySQL for data persistence!"
echo "Your data will be saved even after server restarts."
echo ""
