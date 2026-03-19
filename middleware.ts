import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect /admin routes and /api/admin routes
  if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
    const isAdmin = process.env.IS_ADMIN === "true";
    if (!isAdmin) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized — admin only" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
