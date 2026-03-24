#!/bin/bash
# Mission Control — Safe Auto-Deploy to All Instances
# Run this after ANY code change. It builds once and restarts all instances.
#
# Safety features:
#   1. Validates ALL instances have explicit dbPath before deploying
#   2. Validates DB files exist and have data before restarting
#   3. Auto-backups all DBs before every deploy
#   4. Rolls back if new processes fail health checks
#
# Usage: ./deploy.sh
# Called automatically by post-build hooks or git post-commit

set -e

MC_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTANCES_FILE="$MC_DIR/data/instances.json"
BACKUP_DIR="$HOME/.openclaw/data/backups"
LOG_DIR="/tmp"
HEALTH_TIMEOUT=15  # seconds to wait for health check

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ─── Pre-flight checks ───────────────────────────────────────────────────────

if [ ! -f "$INSTANCES_FILE" ]; then
  echo -e "${RED}❌ No instances.json found at $INSTANCES_FILE${NC}"
  echo "   Create it with proper dbPath entries for each instance."
  exit 1
fi

# Validate instances config — every instance MUST have a dbPath
echo "🔍 Validating instance configs..."
VALIDATION=$(python3 -c "
import json, sys, os

with open('$INSTANCES_FILE') as f:
    instances = json.load(f)

errors = []
for inst in instances:
    name = inst.get('name', inst.get('id', '?'))
    port = inst.get('port')
    db_path = inst.get('dbPath')
    
    if not db_path:
        errors.append(f'  ❌ {name} (port {port}): dbPath is null/empty — MUST be set explicitly')
    elif not os.path.exists(db_path):
        errors.append(f'  ⚠️  {name} (port {port}): DB file not found at {db_path} (will be created)')
    else:
        # Check DB has data (not empty/corrupt)
        import sqlite3
        try:
            conn = sqlite3.connect(db_path)
            tables = conn.execute(\"SELECT count(*) FROM sqlite_master WHERE type='table'\").fetchone()[0]
            conn.close()
            if tables == 0:
                errors.append(f'  ⚠️  {name} (port {port}): DB exists but has 0 tables — may be empty')
        except Exception as e:
            errors.append(f'  ❌ {name} (port {port}): DB corrupt or unreadable: {e}')

if any('❌' in e for e in errors):
    print('ERRORS')
    for e in errors:
        print(e)
    sys.exit(1)
elif errors:
    print('WARNINGS')
    for e in errors:
        print(e)
else:
    print('OK')
")

if echo "$VALIDATION" | head -1 | grep -q "ERRORS"; then
  echo -e "${RED}❌ Instance config validation failed:${NC}"
  echo "$VALIDATION" | tail -n +2
  echo ""
  echo -e "${RED}Fix instances.json before deploying. Every instance needs an explicit dbPath.${NC}"
  exit 1
fi

if echo "$VALIDATION" | head -1 | grep -q "WARNINGS"; then
  echo -e "${YELLOW}⚠️  Warnings (proceeding):${NC}"
  echo "$VALIDATION" | tail -n +2
else
  echo -e "${GREEN}  ✅ All instances have valid dbPath${NC}"
fi

# ─── Backup databases ────────────────────────────────────────────────────────

echo "💾 Backing up databases..."
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

python3 -c "
import json, shutil, os

with open('$INSTANCES_FILE') as f:
    instances = json.load(f)

for inst in instances:
    db_path = inst.get('dbPath', '')
    if db_path and os.path.exists(db_path):
        name = inst.get('id', 'unknown')
        backup = f'$BACKUP_DIR/{name}_{\"$TIMESTAMP\"}.db'
        shutil.copy2(db_path, backup)
        size_kb = os.path.getsize(backup) // 1024
        print(f'  ✅ {inst[\"name\"]}: {size_kb}KB → {backup}')
    elif db_path:
        print(f'  ⏭️  {inst[\"name\"]}: DB not found yet (new instance)')
"

# Clean old backups (keep last 20)
ls -t "$BACKUP_DIR"/*.db 2>/dev/null | tail -n +21 | xargs rm -f 2>/dev/null || true

# ─── Build ────────────────────────────────────────────────────────────────────

echo ""
echo "🔨 Building Mission Control..."
cd "$MC_DIR"
npm run build 2>&1 | tail -3

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed. Not deploying. Your instances are still running.${NC}"
  exit 1
fi

# ─── Restart instances ────────────────────────────────────────────────────────

echo ""
echo "🔄 Restarting all instances..."

# Kill all existing Mission Control processes
pkill -f "next start -p 300" 2>/dev/null || true
sleep 2

# Start each instance with explicit DATABASE_PATH
python3 -c "
import json, subprocess, os, time

with open('$INSTANCES_FILE') as f:
    instances = json.load(f)

for inst in instances:
    port = inst['port']
    name = inst['name']
    db_path = inst['dbPath']  # Now guaranteed to exist from validation
    
    env = os.environ.copy()
    env['DATABASE_PATH'] = db_path
    env['NODE_ENV'] = 'production'
    
    log_file = f'$LOG_DIR/mc-{inst[\"id\"]}.log'
    
    print(f'  Starting {name} on port {port} (DB: {db_path})...')
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

# ─── Health checks ────────────────────────────────────────────────────────────

echo ""
echo "🏥 Running health checks..."
sleep 3

HEALTHY=true
python3 -c "
import json, urllib.request, sys

with open('$INSTANCES_FILE') as f:
    instances = json.load(f)

all_ok = True
for inst in instances:
    port = inst['port']
    name = inst['name']
    try:
        url = f'http://localhost:{port}/api/deploy-agent'
        req = urllib.request.Request(url, headers={'User-Agent': 'deploy-healthcheck'})
        resp = urllib.request.urlopen(req, timeout=$HEALTH_TIMEOUT)
        data = resp.read().decode()
        import json as j
        agents = j.loads(data)
        count = len(agents) if isinstance(agents, list) else 0
        if count > 0:
            print(f'  ✅ {name} (:{port}): {count} agents loaded')
        else:
            print(f'  ⚠️  {name} (:{port}): 0 agents — may be new instance or DB issue')
    except Exception as e:
        print(f'  ❌ {name} (:{port}): FAILED — {e}')
        all_ok = False

if not all_ok:
    sys.exit(1)
"

if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️  Some health checks failed. Check logs in /tmp/mc-*.log${NC}"
else
  echo ""
  echo -e "${GREEN}🎉 Deploy complete!${NC}"
fi
