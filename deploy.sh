#!/bin/bash
# Mission Control — Auto-Deploy to All Instances
# Run this after ANY code change. It builds once and restarts all instances.
#
# Usage: ./deploy.sh
# Called automatically by post-build hooks or git post-commit

set -e

MC_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTANCES_FILE="$MC_DIR/data/instances.json"
LOG_DIR="/tmp"

echo "🔨 Building Mission Control..."
cd "$MC_DIR"
npm run build 2>&1 | tail -3

if [ $? -ne 0 ]; then
  echo "❌ Build failed. Not deploying."
  exit 1
fi

echo ""
echo "🔄 Restarting all instances..."

# Kill all existing Mission Control processes
pkill -f "next start -p 300" 2>/dev/null || true
sleep 2

# Read instances config
if [ ! -f "$INSTANCES_FILE" ]; then
  echo "⚠️  No instances.json found. Creating default..."
  mkdir -p "$MC_DIR/data"
  cat > "$INSTANCES_FILE" << 'EOJSON'
[
  {
    "id": "samvel",
    "name": "Samvel",
    "port": 3001,
    "dbPath": null,
    "telegramId": "1330715389"
  },
  {
    "id": "anna",
    "name": "Anna",
    "port": 3002,
    "dbPath": "/Users/test7/.openclaw/data/users/anna-gasparyan/mission-control.db",
    "telegramId": "530187071"
  }
]
EOJSON
fi

# Start each instance
python3 -c "
import json, subprocess, os, time

with open('$INSTANCES_FILE') as f:
    instances = json.load(f)

for inst in instances:
    port = inst['port']
    name = inst['name']
    db_path = inst.get('dbPath') or ''
    
    env = os.environ.copy()
    if db_path:
        env['DATABASE_PATH'] = db_path
    
    log_file = f'$LOG_DIR/mc-{inst[\"id\"]}.log'
    
    print(f'  Starting {name} on port {port}...')
    with open(log_file, 'w') as log:
        subprocess.Popen(
            ['npm', 'exec', 'next', 'start', '--', '-p', str(port)],
            cwd='$MC_DIR',
            env=env,
            stdout=log,
            stderr=log,
            start_new_session=True
        )
    time.sleep(1)

print()
print('✅ All instances deployed:')
for inst in instances:
    print(f'  {inst[\"name\"]}: http://localhost:{inst[\"port\"]}')
"

echo ""
echo "🎉 Deploy complete!"
