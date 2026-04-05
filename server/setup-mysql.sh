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
