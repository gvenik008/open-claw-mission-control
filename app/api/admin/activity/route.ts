import { NextResponse } from "next/server";
import { masterDb } from "@/lib/master-db";

export async function GET() {
  const rows = masterDb.prepare("SELECT * FROM master_activity ORDER BY created_at DESC LIMIT 100").all();
  return NextResponse.json(rows);
}
