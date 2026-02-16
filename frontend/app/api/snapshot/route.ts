import { NextResponse } from "next/server";

const BACKEND_API_BASE = process.env.BACKEND_API_BASE ?? "http://127.0.0.1:5001";

export async function GET() {
  const url = `${BACKEND_API_BASE}/api/snapshot`;
  try {
    const resp = await fetch(url, { cache: "no-store" });
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
