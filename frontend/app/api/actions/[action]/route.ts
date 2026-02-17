import { NextRequest, NextResponse } from "next/server";
import { backendUrl, getAuthToken, withAuthHeader } from "../../_shared";

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const url = backendUrl(`/api/actions/${action}`);
  const token = getAuthToken(req);

  let payload: unknown = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  try {
    const headers = withAuthHeader(token, { "Content-Type": "application/json" });
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });
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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
