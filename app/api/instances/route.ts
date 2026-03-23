import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const HOME = process.env.HOME || "";
const INSTANCES_FILE = join(process.cwd(), "data", "instances.json");
const USERS_DIR = join(HOME, ".openclaw", "data", "users");

interface Instance {
  id: string;
  name: string;
  port: number;
  dbPath: string | null;
  telegramId: string;
  createdAt?: string;
}

function loadInstances(): Instance[] {
  if (!existsSync(INSTANCES_FILE)) return [];
  try {
    return JSON.parse(readFileSync(INSTANCES_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveInstances(instances: Instance[]) {
  writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2));
}

// GET — list all instances
export async function GET() {
  const instances = loadInstances();
  
  // Check if each instance is alive
  const checked = await Promise.all(instances.map(async (inst) => {
    let alive = false;
    try {
      const res = await fetch(`http://localhost:${inst.port}/api/deploy-agent`, { signal: AbortSignal.timeout(2000) });
      alive = res.ok;
    } catch {}
    return { ...inst, alive };
  }));
  
  return NextResponse.json(checked);
}

// POST — add new instance (auto-provision for new Telegram user)
export async function POST(req: NextRequest) {
  try {
    const { name, telegramId } = await req.json();
    if (!name || !telegramId) {
      return NextResponse.json({ error: "name and telegramId required" }, { status: 400 });
    }

    const instances = loadInstances();
    
    // Check if user already has an instance
    const existing = instances.find((i) => i.telegramId === telegramId);
    if (existing) {
      return NextResponse.json({ exists: true, instance: existing });
    }

    // Find next available port
    const usedPorts = instances.map((i) => i.port);
    let nextPort = 3001;
    while (usedPorts.includes(nextPort)) nextPort++;

    // Create user data directory + DB
    const userId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const userDir = join(USERS_DIR, userId);
    mkdirSync(userDir, { recursive: true });
    
    const dbPath = join(userDir, "mission-control.db");

    const newInstance: Instance = {
      id: userId,
      name,
      port: nextPort,
      dbPath,
      telegramId,
      createdAt: new Date().toISOString(),
    };

    instances.push(newInstance);
    saveInstances(instances);

    return NextResponse.json({ success: true, instance: newInstance, message: `Instance created for ${name} on port ${nextPort}. Run deploy.sh to start.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove instance
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    
    const instances = loadInstances();
    const filtered = instances.filter((i) => i.id !== id);
    if (filtered.length === instances.length) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }
    
    saveInstances(filtered);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
