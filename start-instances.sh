#!/bin/bash
# Start all Mission Control instances from the same codebase
# Each instance gets its own DATABASE_PATH and port

MC_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Starting Mission Control instances..."

# Instance 1: Samvel (default DB, port 3001)
echo "  Starting Samvel (port 3001)..."
cd "$MC_DIR" && nohup npm exec next start -- -p 3001 > /tmp/mc-samvel.log 2>&1 &
echo "    PID: $!"

# Instance 2: Anna (separate DB, port 3002)
echo "  Starting Anna (port 3002)..."
cd "$MC_DIR" && DATABASE_PATH=/Users/test7/.openclaw/data/users/anna-gasparyan/mission-control.db \
  nohup npm exec next start -- -p 3002 > /tmp/mc-anna.log 2>&1 &
echo "    PID: $!"

# Add more instances here:
# DATABASE_PATH=/path/to/user/db nohup npm exec next start -- -p 3003 > /tmp/mc-user3.log 2>&1 &

echo ""
echo "✅ All instances started. Logs: /tmp/mc-*.log"
echo ""
echo "Instances:"
echo "  Samvel: http://localhost:3001"
echo "  Anna:   http://localhost:3002"
