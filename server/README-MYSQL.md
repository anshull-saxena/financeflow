# MySQL Integration Complete ✅

FinanceFlow now supports **hybrid data storage**:
- 📊 **MySQL** for persistent data (when available)
- 💾 **In-memory** fallback (when MySQL not set up)

## Features

✅ Automatic MySQL detection and fallback  
✅ Zero-downtime portability  
✅ One-command setup script  
✅ Works on macOS, Linux, Windows  

## Quick Start

### Option 1: Run with In-Memory Storage (No Setup)
```bash
cd server
node src/full-server.mjs
```

The app works immediately! Data is stored in memory (resets on restart).

### Option 2: Enable MySQL for Data Persistence

Run the automatic setup script:
```bash
cd server
./setup-mysql.sh
```

The script will:
1. Check MySQL installation
2. Create database and user
3. Run migrations
4. Create .env file
5. Optionally seed demo data

**That's it!** Restart the server and your data persists forever.

## Files Created

| File | Purpose |
|------|---------|
| `src/db/connection.mjs` | MySQL connection pool with fallback |
| `src/db/queries.mjs` | Database query functions |
| `src/data-access.mjs` | Hybrid data layer (MySQL + memory) |
| `src/full-server.mjs` | Updated server using data-access layer |
| `setup-mysql.sh` | Automatic MySQL setup script |
| `MYSQL-SETUP.md` | Detailed setup instructions |
| `.env.example` | Environment variables template |

## How It Works

```
┌─────────────────┐
│  API Request    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  data-access.mjs│ ◄── Checks if MySQL available
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌──────┐
│ MySQL │ │Memory│
│  DB   │ │Array │
└───────┘ └──────┘
```

**If MySQL is available:** All operations use database  
**If MySQL is not set up:** Falls back to in-memory arrays

## Benefits

🚀 **Portable**: Works on any device instantly  
🔒 **Safe**: Never loses data if MySQL is set up  
⚡ **Fast**: Connection pooling for performance  
🛠️ **Flexible**: Switch between modes anytime  

## Verify Setup

Check which mode you're running:

```bash
node src/full-server.mjs
```

Look for one of these messages:
- `📊 Using MySQL database for data persistence` ✅ MySQL mode
- `💾 Using in-memory storage` ⚠️ Memory mode

## Setup MySQL on Another Device

1. Copy the entire `server/` folder
2. Install MySQL on the new device
3. Run `./setup-mysql.sh`
4. Start server: `node src/full-server.mjs`

Done! All your data structure is ready.

## Environment Variables

Create `.env` file (or use defaults):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=financeflow
DB_PASSWORD=financeflow
DB_NAME=financeflow

PORT=3001
NODE_ENV=development
```

## Troubleshooting

**Server says "Using in-memory storage" but I want MySQL:**
- Run `./setup-mysql.sh` to set up database
- Check `.env` file exists with correct credentials
- Verify MySQL is running: `mysqladmin ping`

**MySQL connection errors:**
- Check MySQL is running
- Verify credentials in `.env`
- Check firewall settings

**Need to reset database:**
```bash
mysql -ufinanceflow -pfinanceflow financeflow < migrations/001_init.sql
```

## Production Recommendations

- Change default password in `.env`
- Enable MySQL SSL
- Set up regular backups
- Use environment-specific `.env` files

---

**Need help?** See `MYSQL-SETUP.md` for detailed manual setup instructions.
