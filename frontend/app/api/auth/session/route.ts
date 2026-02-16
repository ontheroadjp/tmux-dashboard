import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_BASE = process.env.BACKEND_API_BASE ?? "http://127.0.0.1:5001";
const AUTH_COOKIE_NAME = "tmux_dashboard_token";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value ?? "";
  if (!token) {
    return NextResponse.json({ ok: false, authenticated: false, error: "unauthorized" }, { status: 401 });
  }

  const url = `${BACKEND_API_BASE}/api/auth/session`;
  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const json = (await resp.json().catch(() => ({}))) as {
      ok?: boolean;
      authenticated?: boolean;
      user?: string;
      error?: string;
    };

    if (!resp.ok) {
      const response = NextResponse.json(
        { ok: false, authenticated: false, error: json.error ?? "unauthorized" },
        { status: resp.status || 401 }
      );
      response.cookies.set(AUTH_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    return NextResponse.json({
      ok: true,
      authenticated: Boolean(json.authenticated),
      user: json.user ?? "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "network error";
    return NextResponse.json(
      { ok: false, authenticated: false, error: `backend request failed: ${message} (${url})` },
      { status: 502 }
    );
  }
}
