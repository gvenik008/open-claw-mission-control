import { NextRequest, NextResponse } from "next/server";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const REPORTS_DIR = join(process.cwd(), "reports");

// Ensure dir exists
try { mkdirSync(REPORTS_DIR, { recursive: true }); } catch {}

export async function GET() {
  try {
    const files = readdirSync(REPORTS_DIR)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();

    const reports = files.map((filename) => {
      const content = readFileSync(join(REPORTS_DIR, filename), "utf8");
      const title = content.split("\n").find((l) => l.startsWith("# "))?.replace("# ", "") || filename;
      return {
        filename,
        title,
        content,
        date: filename.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "",
      };
    });

    return NextResponse.json(reports);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { filename, content } = await req.json();
    if (!filename || !content) {
      return NextResponse.json({ error: "filename and content required" }, { status: 400 });
    }
    const safeName = filename.replace(/[^a-zA-Z0-9\-_.]/g, "");
    writeFileSync(join(REPORTS_DIR, safeName), content);
    return NextResponse.json({ success: true, filename: safeName });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
