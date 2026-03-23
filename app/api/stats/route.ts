import { NextRequest, NextResponse } from "next/server";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const HOME = process.env.HOME || "";
const SESSIONS_DIR = join(HOME, ".openclaw", "agents", "main", "sessions");
const SESSIONS_INDEX = join(SESSIONS_DIR, "sessions.json");

interface UserStats {
  telegramId: string;
  totalTokens: number;
  totalCost: number;
  totalMessages: number;
  sessionCount: number;
  model: string;
  lastActivity: string;
}

function getSessionIndex(): Record<string, any> {
  if (!existsSync(SESSIONS_INDEX)) return {};
  try {
    return JSON.parse(readFileSync(SESSIONS_INDEX, "utf8"));
  } catch {
    return {};
  }
}

function parseTranscriptUsage(filePath: string): { totalTokens: number; totalCost: number; messageCount: number; model: string; lastActivity: string } {
  let totalTokens = 0;
  let totalCost = 0;
  let messageCount = 0;
  let model = "";
  let lastActivity = "";

  try {
    const content = readFileSync(filePath, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Messages with usage data (nested format: entry.message.usage)
        if (entry.type === "message" && entry.message) {
          const msg = entry.message;
          if (msg.role === "user") messageCount++;
          if (msg.usage) {
            if (msg.usage.totalTokens) totalTokens = msg.usage.totalTokens;
            if (msg.usage.cost?.total) totalCost = msg.usage.cost.total;
          }
          if (msg.model) model = msg.model;
          if (msg.timestamp) lastActivity = new Date(msg.timestamp).toISOString();
        }

        // Top-level format (older)
        if (entry.role === "user") messageCount++;
        if (entry.usage) {
          if (entry.usage.totalTokens && entry.usage.totalTokens > totalTokens) totalTokens = entry.usage.totalTokens;
          if (entry.usage.cost?.total && entry.usage.cost.total > totalCost) totalCost = entry.usage.cost.total;
        }
      } catch {
        // skip
      }
    }
  } catch {
    // skip
  }

  return { totalTokens, totalCost: Math.round(totalCost * 10000) / 10000, messageCount, model, lastActivity };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const telegramId = searchParams.get("telegramId");

  // Load session index (maps session keys → session IDs)
  const index = getSessionIndex();

  // Build mapping: session key → { telegramId, sessionId, channel }
  const sessionMap: Record<string, { telegramId: string | null; sessionId: string; channel: string; key: string }> = {};

  for (const [key, meta] of Object.entries(index)) {
    const sessionId = (meta as any)?.sessionId;
    if (!sessionId) continue;

    let tid: string | null = null;
    let channel = "unknown";

    if (key.includes("telegram:direct:")) {
      const match = key.match(/telegram:direct:(\d+)/);
      if (match) tid = match[1];
      channel = "telegram";
    } else if (key.includes("webchat") || key === "agent:main:main") {
      channel = "webchat";
    } else if (key.includes("subagent:")) {
      channel = "subagent";
    }

    sessionMap[sessionId] = { telegramId: tid, sessionId, channel, key };
  }

  // Parse all session transcripts
  const results: Record<string, UserStats> = {};
  let overallTokens = 0;
  let overallCost = 0;
  let overallMessages = 0;
  let overallSessions = 0;

  for (const [sessionId, info] of Object.entries(sessionMap)) {
    const filePath = join(SESSIONS_DIR, `${sessionId}.jsonl`);
    if (!existsSync(filePath)) continue;

    const usage = parseTranscriptUsage(filePath);
    if (!usage.totalTokens && !usage.messageCount) continue;

    const userKey = info.telegramId || info.channel;

    if (!results[userKey]) {
      results[userKey] = {
        telegramId: info.telegramId || "",
        totalTokens: 0,
        totalCost: 0,
        totalMessages: 0,
        sessionCount: 0,
        model: "",
        lastActivity: "",
      };
    }

    results[userKey].totalTokens += usage.totalTokens;
    results[userKey].totalCost += usage.totalCost;
    results[userKey].totalMessages += usage.messageCount;
    results[userKey].sessionCount++;
    if (usage.model) results[userKey].model = usage.model;
    if (usage.lastActivity > results[userKey].lastActivity) results[userKey].lastActivity = usage.lastActivity;

    overallTokens += usage.totalTokens;
    overallCost += usage.totalCost;
    overallMessages += usage.messageCount;
    overallSessions++;
  }

  // If specific telegram ID requested
  if (telegramId) {
    const user = results[telegramId];
    if (!user) {
      return NextResponse.json({
        telegramId,
        totalTokens: 0,
        totalCost: 0,
        totalMessages: 0,
        sessionCount: 0,
        model: "",
        lastActivity: "",
      });
    }
    return NextResponse.json(user);
  }

  // Return all users
  return NextResponse.json({
    overall: {
      totalTokens: overallTokens,
      totalCost: Math.round(overallCost * 10000) / 10000,
      totalMessages: overallMessages,
      totalSessions: overallSessions,
    },
    users: results,
  });
}
