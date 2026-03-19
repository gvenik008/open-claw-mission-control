import { NextRequest, NextResponse } from "next/server";
import { getUserByTelegramId } from "@/lib/user-router";

/**
 * User Proxy — routes API calls to the correct user's Mission Control.
 * 
 * Works for all methods (GET, POST, PATCH, DELETE).
 * 
 * Headers:
 *   x-telegram-id: the user's Telegram ID
 * 
 * Query params:
 *   path: the API path to call (e.g. /api/deploy-agent)
 * 
 * Examples:
 *   GET  /api/user-proxy?path=/api/deploy-agent  (with x-telegram-id header)
 *   POST /api/user-proxy?path=/api/deploy-agent  (with x-telegram-id header + body)
 */

async function handleProxy(req: NextRequest) {
  const telegramId = req.headers.get("x-telegram-id");
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!telegramId) {
    return NextResponse.json({ error: "x-telegram-id header required" }, { status: 400 });
  }
  if (!path) {
    return NextResponse.json({ error: "path query param required" }, { status: 400 });
  }

  const user = getUserByTelegramId(telegramId);
  if (!user) {
    return NextResponse.json({ error: "User not provisioned", telegramId, provisioned: false }, { status: 404 });
  }

  // Forward the request to the user's MC
  const targetUrl = `${user.mcUrl}${path}`;

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: { "Content-Type": "application/json" },
    };

    // Forward body for non-GET requests
    if (req.method !== "GET" && req.method !== "HEAD") {
      try {
        const body = await req.json();
        fetchOptions.body = JSON.stringify(body);
      } catch {
        // No body — that's fine
      }
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();

    return NextResponse.json({
      ...data,
      _proxy: { user: user.username, mcPort: user.mcPort, path },
    }, { status: response.status });
  } catch (err: any) {
    return NextResponse.json({
      error: `Failed to reach user's MC at ${user.mcUrl}`,
      detail: err.message,
      mcPort: user.mcPort,
      status: user.status,
    }, { status: 502 });
  }
}

export async function GET(req: NextRequest) { return handleProxy(req); }
export async function POST(req: NextRequest) { return handleProxy(req); }
export async function PATCH(req: NextRequest) { return handleProxy(req); }
export async function DELETE(req: NextRequest) { return handleProxy(req); }
