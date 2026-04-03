# 🚀 How to Run FinanceFlow

## Quick Start (2 Steps)

```bash
# 1. Navigate to server directory
cd /Users/anshul/Documents/Arushi/Financial_Planner/financeflow/server

# 2. Start the server
node src/full-server.mjs
```

That's it! You'll see:
```
🚀 FinanceFlow Server Started
================================
📍 Local:   http://localhost:3001
🔧 API:     http://localhost:3001/api
💚 Health:  http://localhost:3001/health
================================

💾 Using in-memory storage (run ./setup-mysql.sh to enable MySQL)
```

## Open in Browser

```
http://localhost:3001
```

The app is now running! All features work with real data.

## 📱 Available Pages

- **Dashboard:** `http://localhost:3001/` (main page)
- **Income:** `http://localhost:3001/income`
- **Expenses:** `http://localhost:3001/expenses`
- **Analytics:** `http://localhost:3001/analytics`
- **Settings:** `http://localhost:3001/settings`
- **Login:** `http://localhost:3001/login`

## 🔐 Demo Login

If you need to test login:
```
Email: demo@financeflow.local
Password: demo123
```

## 💡 Tips

**To stop the server:** Press `Ctrl+C`

**To enable MySQL (optional):**
```bash
cd server
./setup-mysql.sh
node src/full-server.mjs
```

**Check if server is running:**
```bash
curl http://localhost:3001/health
```

## 🎯 That's All!

The app is fully functional right now with in-memory storage. All CRUD operations, charts, analytics - everything works! 🎉

## 🗄️ Storage Modes

### In-Memory Mode (Default)
- ✅ Works immediately, no setup
- ⚠️ Data resets when server restarts
- Perfect for development and demos

### MySQL Mode (Persistent)
- ✅ Data persists forever
- ✅ Production-ready
- Run `./setup-mysql.sh` to enable

## 🆘 Troubleshooting

**Port 3001 already in use:**
```bash
# Find and kill the process
lsof -ti:3001 | xargs kill -9
```

**Module not found errors:**
```bash
# Reinstall dependencies
cd server
npm install
```

**Server won't start:**
- Make sure you're in the `server/` directory
- Check Node.js is installed: `node --version` (need v14+)
- Verify files exist: `ls src/full-server.mjs`

**Browser shows "Cannot connect":**
- Make sure server is running
- Check the terminal for error messages
- Verify you're accessing `http://localhost:3001`

---

**Need help?** Check `README.md` for full documentation.
