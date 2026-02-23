import { NextRequest, NextResponse } from "next/server";
import { backendUrl, getAuthToken, withAuthHeader } from "../../_shared";

function toBackendPath(segments: string[]): string {
  if (!segments.length) {
    return "/api/certs";
  }
  return `/api/certs/${segments.map(encodeURIComponent).join("/")}`;
}

function authRequiredFor(segments: string[]): boolean {
  return !(segments.length >= 2 && segments[0] === "distribution");
}

async function proxy(req: NextRequest, method: "GET" | "POST", segments: string[]) {
  const url = backendUrl(toBackendPath(segments));
  const token = getAuthToken(req);
  const headers = authRequiredFor(segments)
    ? withAuthHeader(token, method === "POST" ? { "Content-Type": "application/json" } : {})
    : method === "POST"
      ? { "Content-Type": "application/json" }
      : {};

  let body: string | undefined = undefined;
  if (method === "POST") {
    let payload: unknown = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }
    body = JSON.stringify(payload);
  }

  try {
    const resp = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
    });
    const text = await resp.text();
    return new NextResponse(text, {
      status: resp.status,
      headers: { "Content-Type": resp.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "network error";
    return NextResponse.json({ ok: false, error: `backend request failed: ${message}` }, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await params;
  return proxy(req, "GET", segments ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await params;
  return proxy(req, "POST", segments ?? []);
}
