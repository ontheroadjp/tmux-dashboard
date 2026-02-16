import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_BASE = process.env.BACKEND_API_BASE ?? "http://127.0.0.1:5001";
const AUTH_COOKIE_NAME = "tmux_dashboard_token";

export async function GET(req: NextRequest, { params }: { params: Promise<{ paneId: string }> }) {
  const { paneId } = await params;
  const url = `${BACKEND_API_BASE}/api/panes/${encodeURIComponent(paneId)}`;
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value ?? "";

  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const resp = await fetch(url, { cache: "no-store", headers });
    const text = await resp.text();
    return new NextResponse(text, {
      status: resp.status,
      headers: { "Content-Type": resp.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "network error";
    return NextResponse.json({ ok: false, error: `backend request failed: ${message} (${url})` }, { status: 502 });
  }
}
