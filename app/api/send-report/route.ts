import { NextRequest, NextResponse } from "next/server";
import { readdirSync, readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const REPORTS_DIR = join(process.cwd(), "reports");
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

// Read bot token from OpenClaw config if not in env
function getBotToken(): string {
  if (BOT_TOKEN) return BOT_TOKEN;
  try {
    const configPath = join(process.env.HOME || "", ".openclaw", "openclaw.json");
    const raw = readFileSync(configPath, "utf8");
    // Extract botToken — handles both JS-style and JSON-style configs
    const match = raw.match(/["']?botToken["']?\s*[:=]\s*["']([^"']+)["']/);
    if (match) return match[1];
  } catch {}
  return "";
}

function getReportType(filename: string): string {
  if (filename.includes("security")) return "🛡️ Security";
  if (filename.includes("product")) return "💡 Product";
  if (filename.includes("full-report")) return "📋 Full QA";
  if (filename.includes("qa") || filename.includes("functional")) return "🔍 QA";
  if (filename.includes("cross-page") || filename.includes("nav")) return "🧭 Navigation";
  return "📄 Report";
}

// POST — send a specific report to a telegram user
export async function POST(req: NextRequest) {
  try {
    const { telegramId, filename, content } = await req.json();

    if (!telegramId) {
      return NextResponse.json({ error: "telegramId required" }, { status: 400 });
    }

    const token = getBotToken();
    if (!token) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
    }

    // If content is provided directly, save as temp file and send
    if (content && filename) {
      const tmpPath = join(REPORTS_DIR, filename);
      writeFileSync(tmpPath, content);
    }

    // If filename provided, send that file
    if (filename) {
      const filePath = join(REPORTS_DIR, filename);
      if (!existsSync(filePath)) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      const fileContent = readFileSync(filePath);
      const type = getReportType(filename);

      // Send via Telegram Bot API
      const formData = new FormData();
      formData.append("chat_id", telegramId);
      formData.append("document", new Blob([fileContent], { type: "text/markdown" }), filename);
      formData.append("caption", `${type} Report\n📅 ${filename.match(/\d{4}-\d{2}-\d{2}/)?.[0] || ""}`.trim());

      const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (!result.ok) {
        return NextResponse.json({ error: result.description }, { status: 500 });
      }

      return NextResponse.json({ success: true, messageId: result.result?.message_id });
    }

    return NextResponse.json({ error: "filename or content required" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — list available reports (with download-friendly metadata)
export async function GET(req: NextRequest) {
  try {
    if (!existsSync(REPORTS_DIR)) return NextResponse.json([]);

    const files = readdirSync(REPORTS_DIR)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();

    const reports = files.map((filename) => {
      const content = readFileSync(join(REPORTS_DIR, filename), "utf8");
      const title = content.split("\n").find((l) => l.startsWith("# "))?.replace("# ", "") || filename;
      const type = getReportType(filename);
      const date = filename.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
      const sizeKB = Math.round(content.length / 1024);

      return { filename, title, type, date, sizeKB };
    });

    return NextResponse.json(reports);
  } catch {
    return NextResponse.json([]);
  }
}
