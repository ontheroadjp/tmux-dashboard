import { NextRequest, NextResponse } from "next/server";
import { backendUrl, getAuthToken, withAuthHeader } from "../../_shared";

export async function GET(req: NextRequest, { params }: { params: Promise<{ paneId: string }> }) {
  const { paneId } = await params;
  const url = backendUrl(`/api/panes/${encodeURIComponent(paneId)}`);
  const token = getAuthToken(req);

  try {
    const headers = withAuthHeader(token);

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
