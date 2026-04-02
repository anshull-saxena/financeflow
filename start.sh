#!/usr/bin/env bash

# FinanceFlow Smart Startup Script
# Intelligently starts the application with minimal setup redundancy

set -euo pipefail

# ============================================================================
# Configuration and Constants
# ============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ROOT_DIR="$SCRIPT_DIR"
readonly SERVER_DIR="$ROOT_DIR/server"
readonly SITE_DIR="$ROOT_DIR/site/public"
readonly PID_DIR="$ROOT_DIR/.pids"
readonly LOG_DIR="$ROOT_DIR/.logs"

# Default configuration
readonly DEFAULT_FRONTEND_PORT=8000
readonly DEFAULT_MYSQL_HOST="127.0.0.1"
readonly DEFAULT_MYSQL_PORT=3306
readonly DEFAULT_MYSQL_DB="financeflow"
readonly DEFAULT_MYSQL_USER="financeflow"
readonly DEFAULT_MYSQL_PASS="financeflow"

# Process tracking
FRONTEND_PID=""
PROCESSES_TO_CLEANUP=()

# ============================================================================
# Utility Functions
# ============================================================================

# Color and formatting functions
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

info() {
    printf "${BLUE}ℹ${NC} %s\n" "$*"
}

success() {
    printf "${GREEN}✓${NC} %s\n" "$*"
}

warn() {
    printf "${YELLOW}⚠${NC} %s\n" "$*" >&2
}

error() {
    printf "${RED}✗${NC} %s\n" "$*" >&2
}

fatal() {
    error "$*"
    exit 1
}

step() {
    printf "\n${PURPLE}${BOLD}=== %s ===${NC}\n" "$*"
}

# Check if command exists
has_cmd() {
    command -v "$1" >/dev/null 2>&1
}

# Check if port is in use
is_port_used() {
    local port="$1"
    lsof -i ":$port" >/dev/null 2>&1
}

# Get process ID using a port
get_port_pid() {
    local port="$1"
    lsof -t -i ":$port" 2>/dev/null | head -1
}

# Check if process is running
is_process_running() {
    local pid="$1"
    [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

# Create directory if it doesn't exist
ensure_dir() {
    local dir="$1"
    [[ ! -d "$dir" ]] && mkdir -p "$dir"
}

# Read PID from file
read_pid_file() {
    local pid_file="$1"
    [[ -f "$pid_file" ]] && cat "$pid_file" 2>/dev/null || echo ""
}

# Write PID to file
write_pid_file() {
    local pid="$1"
    local pid_file="$2"
    echo "$pid" > "$pid_file"
}

# Remove PID file
remove_pid_file() {
    local pid_file="$1"
    [[ -f "$pid_file" ]] && rm -f "$pid_file"
}

# Version comparison (semantic versioning)
version_gte() {
    local version="$1"
    local required="$2"
    printf '%s\n%s\n' "$required" "$version" | sort -V -C
}

# ============================================================================
# Cleanup and Signal Handling
# ============================================================================

cleanup() {
    if [[ ${#PROCESSES_TO_CLEANUP[@]} -gt 0 ]]; then
        info "Cleaning up processes..."
        
        # Stop tracked processes
        for pid in "${PROCESSES_TO_CLEANUP[@]}"; do
            if is_process_running "$pid"; then
                info "Stopping process $pid"
                kill "$pid" 2>/dev/null || true
                sleep 1
                if is_process_running "$pid"; then
                    warn "Force killing process $pid"
                    kill -9 "$pid" 2>/dev/null || true
                fi
            fi
        done
        
        success "Cleanup completed"
    fi
    
    # Clean up PID files
    if [[ -d "$PID_DIR" ]]; then
        rm -f "$PID_DIR"/*.pid 2>/dev/null || true
    fi
}

# Set up signal handlers
setup_signal_handlers() {
    trap cleanup EXIT
    trap 'cleanup; exit 130' SIGINT
    trap 'cleanup; exit 143' SIGTERM
}

# ============================================================================
# Prerequisites and Environment Checks
# ============================================================================

check_prerequisites() {
    step "Checking Prerequisites"
    
    local missing_deps=()
    
    # Check required commands
    local required_cmds=("node" "npm" "python3")
    for cmd in "${required_cmds[@]}"; do
        if has_cmd "$cmd"; then
            success "$cmd is available"
        else
            missing_deps+=("$cmd")
            error "$cmd is not installed"
        fi
    done
    
    # Check optional but recommended commands
    if has_cmd "mysql"; then
        success "mysql client is available"
    else
        warn "mysql client not found - database operations will be limited"
    fi
    
    # Fail if critical dependencies are missing
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        fatal "Missing required dependencies: ${missing_deps[*]}"
    fi
    
    # Check Node.js version
    if has_cmd "node"; then
        local node_version
        node_version="$(node --version | sed 's/^v//')"
        if version_gte "$node_version" "18.0.0"; then
            success "Node.js $node_version meets requirements (>= 18.0.0)"
        else
            fatal "Node.js $node_version is too old (>= 18.0.0 required)"
        fi
    fi
    
    # Check directory structure
    if [[ ! -d "$SERVER_DIR" ]]; then
        fatal "Server directory not found: $SERVER_DIR"
    fi
    
    if [[ ! -d "$SITE_DIR" ]]; then
        fatal "Site directory not found: $SITE_DIR"
    fi
    
    success "All prerequisites satisfied"
}

# ============================================================================
# Environment Setup
# ============================================================================

setup_environment() {
    step "Setting Up Environment"
    
    # Create working directories
    ensure_dir "$PID_DIR"
    ensure_dir "$LOG_DIR"
    
    # Set up server environment
    local env_file="$SERVER_DIR/.env"
    if [[ ! -f "$env_file" ]]; then
        if [[ -f "$SERVER_DIR/.env.example" ]]; then
            info "Creating .env from example"
            cp "$SERVER_DIR/.env.example" "$env_file"
            success "Created $env_file"
        else
            info "Creating default .env file"
            cat > "$env_file" << EOF
MYSQL_HOST=$DEFAULT_MYSQL_HOST
MYSQL_PORT=$DEFAULT_MYSQL_PORT
MYSQL_USER=$DEFAULT_MYSQL_USER
MYSQL_PASSWORD=$DEFAULT_MYSQL_PASS
MYSQL_DATABASE=$DEFAULT_MYSQL_DB
EOF
            success "Created default $env_file"
        fi
    else
        success ".env file already exists"
    fi
    
    # Source environment variables
    # shellcheck source=/dev/null
    source "$env_file"
    
    # Validate environment
    local required_vars=("MYSQL_HOST" "MYSQL_PORT" "MYSQL_USER" "MYSQL_PASSWORD" "MYSQL_DATABASE")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            fatal "Missing required environment variable: $var"
        fi
    done
    
    success "Environment configured"
}

# ============================================================================
# Database Management
# ============================================================================

test_mysql_connection() {
    local host="$1"
    local port="$2"
    local user="$3"
    local password="$4"
    local database="$5"
    
    if has_cmd "mysql"; then
        mysql -h "$host" -P "$port" -u "$user" -p"$password" -e "SELECT 1;" "$database" >/dev/null 2>&1
    else
        # Fallback: test TCP connection
        if has_cmd "python3"; then
            python3 -c "
import socket, sys
try:
    s = socket.socket()
    s.settimeout(2.0)
    s.connect(('$host', $port))
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null
        else
            # Last resort: use netcat if available
            if has_cmd "nc"; then
                nc -z "$host" "$port" 2>/dev/null
            else
                return 1
            fi
        fi
    fi
}

setup_database() {
    step "Database Setup and Verification"
    
    # Read environment variables
    local host="${MYSQL_HOST:-$DEFAULT_MYSQL_HOST}"
    local port="${MYSQL_PORT:-$DEFAULT_MYSQL_PORT}"
    local user="${MYSQL_USER:-$DEFAULT_MYSQL_USER}"
    local password="${MYSQL_PASSWORD:-$DEFAULT_MYSQL_PASS}"
    local database="${MYSQL_DATABASE:-$DEFAULT_MYSQL_DB}"
    
    info "Testing MySQL connection to $host:$port"
    
    # Test basic connectivity first
    if ! test_mysql_connection "$host" "$port" "$user" "$password" "$database"; then
        warn "Cannot connect to MySQL database"
        
        # Try to help diagnose the issue
        if ! is_port_used "$port"; then
            error "MySQL server is not running on port $port"
            info "Try starting MySQL with: brew services start mysql (macOS) or systemctl start mysql (Linux)"
        else
            success "MySQL server is running on port $port"
            error "Connection failed - check credentials in $SERVER_DIR/.env"
        fi
        
        fatal "Database connection failed"
    fi
    
    success "MySQL connection successful"
    
    # Check if server dependencies are installed
    if [[ ! -d "$SERVER_DIR/node_modules" ]]; then
        info "Installing server dependencies..."
        cd "$SERVER_DIR"
        npm install --no-progress
        success "Server dependencies installed"
    else
        success "Server dependencies already installed"
    fi
    
    # Run database migrations
    info "Running database migrations..."
    cd "$SERVER_DIR"
    if npm run db:migrate 2>/dev/null; then
        success "Database migrations completed"
    else
        fatal "Database migration failed"
    fi
    
    # Optional: database seeding
    info "Database seeding is available but disabled by default"
    info "To enable demo data: export FINANCEFLOW_ALLOW_SEED=1 && ./start.sh"
    if [[ "${FINANCEFLOW_ALLOW_SEED:-}" == "1" ]]; then
        info "Seeding database with demo data..."
        if FINANCEFLOW_ALLOW_SEED=1 npm run db:seed 2>/dev/null; then
            success "Database seeded with demo data"
            info "Demo user: demo@financeflow.local"
        else
            warn "Database seeding failed (may already be seeded)"
        fi
    fi
    
    cd "$ROOT_DIR"
}

# ============================================================================
# Service Management
# ============================================================================

find_available_port() {
    local start_port="$1"
    local port="$start_port"
    
    while is_port_used "$port"; do
        ((port++))
        if [[ $port -gt $((start_port + 100)) ]]; then
            fatal "Could not find available port starting from $start_port"
        fi
    done
    
    echo "$port"
}

start_frontend_server() {
    step "Starting Frontend Server"
    
    local port
    port="$(find_available_port "$DEFAULT_FRONTEND_PORT")"
    
    if [[ "$port" != "$DEFAULT_FRONTEND_PORT" ]]; then
        warn "Port $DEFAULT_FRONTEND_PORT is in use, using port $port instead"
    fi
    
    # Check if already running
    local existing_pid
    existing_pid="$(read_pid_file "$PID_DIR/frontend.pid")"
    if [[ -n "$existing_pid" ]] && is_process_running "$existing_pid"; then
        success "Frontend server already running (PID: $existing_pid)"
        info "Access at: http://localhost:$(lsof -p "$existing_pid" | grep LISTEN | awk '{print $9}' | cut -d: -f2)"
        return 0
    fi
    
    # Start the server
    info "Starting frontend server on port $port..."
    python3 -m http.server "$port" -d "$SITE_DIR" >/dev/null 2>&1 &
    local frontend_pid=$!
    
    # Wait a moment for server to start
    sleep 2
    
    if is_process_running "$frontend_pid"; then
        write_pid_file "$frontend_pid" "$PID_DIR/frontend.pid"
        PROCESSES_TO_CLEANUP+=("$frontend_pid")
        success "Frontend server started (PID: $frontend_pid)"
        info "Access FinanceFlow at: ${CYAN}${BOLD}http://localhost:$port${NC}"
    else
        fatal "Failed to start frontend server"
    fi
    
    FRONTEND_PID="$frontend_pid"
}

perform_health_checks() {
    step "Health Checks"
    
    # Check database
    local host="${MYSQL_HOST:-$DEFAULT_MYSQL_HOST}"
    local port="${MYSQL_PORT:-$DEFAULT_MYSQL_PORT}"
    local user="${MYSQL_USER:-$DEFAULT_MYSQL_USER}"
    local password="${MYSQL_PASSWORD:-$DEFAULT_MYSQL_PASS}"
    local database="${MYSQL_DATABASE:-$DEFAULT_MYSQL_DB}"
    
    if test_mysql_connection "$host" "$port" "$user" "$password" "$database"; then
        success "✓ Database connection healthy"
    else
        error "✗ Database connection failed"
    fi
    
    # Check frontend
    if [[ -n "$FRONTEND_PID" ]] && is_process_running "$FRONTEND_PID"; then
        local frontend_port
        frontend_port="$(lsof -p "$FRONTEND_PID" 2>/dev/null | grep LISTEN | awk '{print $9}' | cut -d: -f2 | head -1)"
        if [[ -n "$frontend_port" ]] && curl -s "http://localhost:$frontend_port" >/dev/null; then
            success "✓ Frontend server responding on port $frontend_port"
        else
            warn "✗ Frontend server not responding"
        fi
    else
        warn "✗ Frontend server not running"
    fi
}

# ============================================================================
# Main Entry Point
# ============================================================================

main() {
    # Set up signal handling
    setup_signal_handlers
    
    # Print banner
    printf "${CYAN}${BOLD}\n"
    printf "╔══════════════════════════════════════════╗\n"
    printf "║            FinanceFlow Startup           ║\n"
    printf "║        Smart Application Launcher        ║\n"
    printf "╚══════════════════════════════════════════╝\n"
    printf "${NC}\n"
    
    # Change to project root
    cd "$ROOT_DIR"
    
    # Run setup phases
    check_prerequisites
    setup_environment
    setup_database
    start_frontend_server
    perform_health_checks
    
    # Final success message with enhanced user experience
    printf "\n${GREEN}${BOLD}🎉 FinanceFlow is now running!${NC}\n\n"
    
    printf "${CYAN}${BOLD}📱 Access the application:${NC}\n"
    if [[ -n "$FRONTEND_PID" ]] && is_process_running "$FRONTEND_PID"; then
        local frontend_port
        frontend_port="$(lsof -p "$FRONTEND_PID" 2>/dev/null | grep LISTEN | awk '{print $9}' | cut -d: -f2 | head -1)"
        printf "  ${BOLD}🌐 Frontend:${NC} ${CYAN}http://localhost:${frontend_port:-8000}${NC}\n"
        
        # Try to open in browser automatically
        if has_cmd "open" && [[ -z "${NO_BROWSER:-}" ]]; then
            info "Opening FinanceFlow in your default browser..."
            open "http://localhost:${frontend_port:-8000}" 2>/dev/null || true
        fi
    fi
    
    printf "\n${YELLOW}${BOLD}💡 Tips & Commands:${NC}\n"
    printf "  ${BOLD}Demo data:${NC} export FINANCEFLOW_ALLOW_SEED=1 && ./start.sh\n"
    printf "  ${BOLD}Stop all:${NC} Press Ctrl+C or run: pkill -f 'python.*http.server'\n"
    printf "  ${BOLD}Logs:${NC} tail -f .logs/*.log (when implemented)\n"
    printf "  ${BOLD}Status:${NC} ps aux | grep -E '(python.*http.server|mysql)'\n"
    printf "  ${BOLD}Restart:${NC} ./start.sh (smart detection will skip existing setup)\n"
    
    printf "\n${PURPLE}${BOLD}📊 Application Features:${NC}\n"
    printf "  • 💰 Income & Expense Tracking\n"
    printf "  • 📈 Financial Analytics & Reports  \n"
    printf "  • 🎯 Goal Setting & Progress Tracking\n"
    printf "  • ⚙️  User Settings & Preferences\n"
    printf "  • 📱 Responsive Mobile-First Design\n"
    
    printf "\n${BOLD}Press Ctrl+C to stop all services${NC}\n"
    
    # Enhanced process monitoring with user feedback
    local health_check_counter=0
    while true; do
        sleep 30
        ((health_check_counter++))
        
        # Periodic health checks (every 2 minutes)
        if [[ $((health_check_counter % 4)) -eq 0 ]]; then
            local all_healthy=true
            
            # Check frontend
            if [[ -n "$FRONTEND_PID" ]] && ! is_process_running "$FRONTEND_PID"; then
                warn "Frontend server stopped unexpectedly (PID: $FRONTEND_PID)"
                all_healthy=false
            fi
            
            # Check database (lightweight check)
            local host="${MYSQL_HOST:-$DEFAULT_MYSQL_HOST}"
            local port="${MYSQL_PORT:-$DEFAULT_MYSQL_PORT}"
            if ! is_port_used "$port"; then
                warn "MySQL server appears to be down on port $port"
                all_healthy=false
            fi
            
            if [[ "$all_healthy" == "true" ]]; then
                success "All services healthy (checked at $(date '+%H:%M:%S'))"
            else
                error "Some services have issues - consider restarting"
                break
            fi
        fi
    done
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi