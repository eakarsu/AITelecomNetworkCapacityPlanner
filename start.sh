#!/bin/bash

# ============================================================
#  AI Telecom Network Capacity Planner - Startup Script
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║   AI Telecom Network Capacity Planner           ║"
echo "  ║   Starting Application...                       ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Load env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

BACKEND_PORT=${BACKEND_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-3001}

# ---- Clean used ports ----
echo -e "${YELLOW}[1/5] Cleaning up ports $BACKEND_PORT and $FRONTEND_PORT...${NC}"
cleanup_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "  Killing processes on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo -e "  Port $port is free"
  fi
}
cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT

# ---- Install dependencies ----
echo -e "${YELLOW}[2/5] Installing dependencies...${NC}"
cd "$SCRIPT_DIR/backend"
if [ ! -d node_modules ]; then
  echo -e "  Installing backend dependencies..."
  npm install
else
  echo -e "  Backend dependencies already installed"
fi

cd "$SCRIPT_DIR/frontend"
if [ ! -d node_modules ]; then
  echo -e "  Installing frontend dependencies..."
  npm install
else
  echo -e "  Frontend dependencies already installed"
fi

# ---- Seed database ----
echo -e "${YELLOW}[3/5] Seeding database...${NC}"
cd "$SCRIPT_DIR/backend"
node seed.js

# ---- Start backend with hot reload (nodemon) ----
echo -e "${YELLOW}[4/5] Starting backend on port $BACKEND_PORT (with hot reload)...${NC}"
cd "$SCRIPT_DIR/backend"
npx nodemon server.js &
BACKEND_PID=$!

# ---- Start frontend with hot reload (vite) ----
echo -e "${YELLOW}[5/5] Starting frontend on port $FRONTEND_PORT (with hot reload)...${NC}"
cd "$SCRIPT_DIR/frontend"
npx vite --port $FRONTEND_PORT &
FRONTEND_PID=$!

# ---- Trap for cleanup ----
cleanup() {
  echo -e "\n${RED}Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  cleanup_port $BACKEND_PORT
  cleanup_port $FRONTEND_PORT
  echo -e "${GREEN}Goodbye!${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ---- Print status ----
sleep 3
echo ""
echo -e "${GREEN}  ╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}  ║   Application is running!                       ║${NC}"
echo -e "${GREEN}  ║                                                  ║${NC}"
echo -e "${GREEN}  ║   Frontend:  http://localhost:$FRONTEND_PORT             ║${NC}"
echo -e "${GREEN}  ║   Backend:   http://localhost:$BACKEND_PORT              ║${NC}"
echo -e "${GREEN}  ║                                                  ║${NC}"
echo -e "${GREEN}  ║   Login:     admin@telecom.com / admin123       ║${NC}"
echo -e "${GREEN}  ║                                                  ║${NC}"
echo -e "${GREEN}  ║   Press Ctrl+C to stop                          ║${NC}"
echo -e "${GREEN}  ╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Wait for both processes
wait
