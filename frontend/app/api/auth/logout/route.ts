import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_BASE = process.env.BACKEND_API_BASE ?? "http://127.0.0.1:5001";
const AUTH_COOKIE_NAME = "tmux_dashboard_token";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value ?? "";
  const url = `${BACKEND_API_BASE}/api/auth/logout`;

  try {
    if (token) {
      await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    }
  } catch {
    // noop: cookie clear is the source of truth for frontend session.
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
