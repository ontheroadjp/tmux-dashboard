import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_BASE = process.env.BACKEND_API_BASE ?? "http://127.0.0.1:5001";
const AUTH_COOKIE_NAME = "tmux_dashboard_token";

export async function POST(req: NextRequest) {
  const url = `${BACKEND_API_BASE}/api/auth/login`;

  let payload: unknown = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const json = (await resp.json().catch(() => ({}))) as {
      ok?: boolean;
      token?: string;
      user?: string;
      expires_in?: number;
      error?: string;
    };

    if (!resp.ok || !json.token) {
      return NextResponse.json(
        { ok: false, error: json.error ?? "login failed" },
        { status: resp.status || 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      user: json.user ?? "",
      expires_in: json.expires_in ?? 86400,
    });

    response.cookies.set(AUTH_COOKIE_NAME, json.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(json.expires_in ?? 86400, 60),
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "network error";
    return NextResponse.json(
      { ok: false, error: `backend request failed: ${message} (${url})` },
      { status: 502 }
    );
  }
}
