# FinanceFlow Startup Script

## Overview

The `start.sh` script is an intelligent, all-in-one launcher for the FinanceFlow application. It automatically handles setup, dependency management, database operations, and service orchestration with minimal user interaction.

## Features

- ✅ **Smart Detection** - Skips redundant setup steps
- ✅ **Database Intelligence** - Automatic MySQL setup and migrations  
- ✅ **Port Management** - Detects conflicts and finds available ports
- ✅ **Process Tracking** - Clean shutdown and resource management
- ✅ **Health Monitoring** - Continuous service health checks
- ✅ **Error Handling** - Helpful diagnostics and recovery suggestions
- ✅ **Cross-Platform** - Works on macOS and Linux

## Quick Start

```bash
# Clone and navigate to project
git clone <repository>
cd financeflow

# Make script executable
chmod +x start.sh

# Start everything
./start.sh
```

The script will automatically:
1. Check prerequisites (Node.js, MySQL, Python)
2. Set up environment configuration
3. Create/verify database and run migrations
4. Start the frontend server
5. Open the app in your browser
6. Monitor services and provide health updates

## Prerequisites

### Required
- **Node.js** >= 18.0.0
- **MySQL** 8.0+ (running on port 3306)
- **npm** (comes with Node.js)
- **Python 3** (for frontend server)

### Optional
- **mysql** command-line client (for enhanced database operations)

### Installation Commands

```bash
# macOS (Homebrew)
brew install node mysql python3

# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm mysql-server python3

# Start MySQL
# macOS: brew services start mysql
# Linux: sudo systemctl start mysql
```

## Configuration

### Environment Variables

The script uses `server/.env` for database configuration:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=financeflow
MYSQL_PASSWORD=financeflow
MYSQL_DATABASE=financeflow
```

### Optional Configuration

```env
# Enable demo data seeding
FINANCEFLOW_ALLOW_SEED=1

# Prevent automatic browser opening
NO_BROWSER=1
```

## Usage Examples

### Basic Startup
```bash
./start.sh
```

### With Demo Data
```bash
export FINANCEFLOW_ALLOW_SEED=1
./start.sh
```

### Quiet Mode (No Browser)
```bash
NO_BROWSER=1 ./start.sh
```

### Test Components
```bash
./test-startup.sh  # Run validation tests
```

## What the Script Does

### Phase 1: Prerequisites Check
- ✅ Verifies Node.js version >= 18
- ✅ Checks for required commands (node, npm, python3, mysql)
- ✅ Validates project directory structure
- ✅ Reports missing dependencies with install instructions

### Phase 2: Environment Setup  
- ✅ Creates `.pids/` and `.logs/` directories
- ✅ Generates `server/.env` from example if missing
- ✅ Validates all required environment variables
- ✅ Sources configuration for use

### Phase 3: Database Management
- ✅ Tests MySQL connectivity with helpful error messages
- ✅ Installs server dependencies if missing (`npm install`)
- ✅ Runs database migrations (`npm run db:migrate`)
- ✅ Optionally seeds demo data if `FINANCEFLOW_ALLOW_SEED=1`

### Phase 4: Service Startup
- ✅ Finds available port (starts from 8000)
- ✅ Detects if services already running
- ✅ Starts Python HTTP server for frontend
- ✅ Tracks process IDs for clean shutdown
- ✅ Automatically opens browser (unless `NO_BROWSER=1`)

### Phase 5: Monitoring
- ✅ Performs initial health checks
- ✅ Monitors service health every 2 minutes
- ✅ Provides status updates and tips
- ✅ Graceful shutdown on Ctrl+C

## Ports Used

| Service | Default Port | Configurable |
|---------|-------------|--------------|
| Frontend | 8000 | Yes (auto-increments if busy) |
| MySQL | 3306 | Yes (`MYSQL_PORT` in .env) |
| Backend API | 5000 | Planned (not yet implemented) |

## File Structure Created

```
financeflow/
├── .pids/          # Process ID files
│   └── frontend.pid
├── .logs/          # Log files (future)
├── server/
│   ├── .env        # Database configuration
│   └── node_modules/  # npm dependencies
└── start.sh        # This script
```

## Troubleshooting

### Common Issues

**"Missing required command: mysql"**
```bash
# macOS
brew install mysql

# Ubuntu/Debian  
sudo apt install mysql-client-core-8.0
```

**"Database connection failed"**
- Check if MySQL is running: `brew services list | grep mysql`
- Verify credentials in `server/.env`
- Test connection: `mysql -h 127.0.0.1 -u financeflow -pfinanceflow financeflow`

**"Port 8000 is in use"**
- Script automatically finds next available port
- Check what's using port: `lsof -i :8000`
- Kill process if needed: `kill <PID>`

**"Node.js version too old"**
```bash
# Update Node.js
# macOS: brew upgrade node
# Ubuntu: Use NodeSource repository or nvm
```

### Debug Mode

Run with debug output:
```bash
bash -x ./start.sh
```

### Manual Cleanup

If script exits unexpectedly:
```bash
# Kill Python servers
pkill -f "python.*http.server"

# Remove PID files
rm -rf .pids/

# Check processes
ps aux | grep -E "(python.*http.server|mysql)"
```

## Advanced Usage

### Database Operations

```bash
# Run migrations manually
cd server && npm run db:migrate

# Seed demo data
cd server && FINANCEFLOW_ALLOW_SEED=1 npm run db:seed

# Connect to database
mysql -h 127.0.0.1 -u financeflow -pfinanceflow financeflow
```

### Service Management

```bash
# Check service status
ps aux | grep -E "(python.*http.server|mysql)"

# View specific process
lsof -i :8000

# Kill specific service
kill $(cat .pids/frontend.pid)
```

## Integration with Development

### With VS Code
Add to `.vscode/tasks.json`:
```json
{
  "label": "Start FinanceFlow",
  "type": "shell",
  "command": "./start.sh",
  "group": "build",
  "presentation": {
    "echo": true,
    "reveal": "always",
    "panel": "new"
  }
}
```

### With package.json
Add to root `package.json`:
```json
{
  "scripts": {
    "start": "./start.sh",
    "dev": "NO_BROWSER=1 ./start.sh"
  }
}
```

## Security Notes

- Database credentials are stored in `server/.env` (not committed to git)
- Default passwords should be changed in production
- Script includes security headers via `vercel.json` for production deployments
- Process isolation ensures clean shutdown

## Performance

- **Startup time**: ~10-15 seconds (depending on MySQL startup)
- **Memory usage**: ~50MB (Python HTTP server + Node.js dependencies)  
- **Health checks**: Every 2 minutes (lightweight)
- **Resource cleanup**: Automatic on exit

## Future Enhancements

- [ ] API server integration (when Express backend is added)
- [ ] Docker Compose alternative
- [ ] Log file management and rotation
- [ ] SSL/TLS support for local development
- [ ] Process supervision and auto-restart
- [ ] Configuration management UI

---

For issues or improvements, please check the project documentation or create an issue.