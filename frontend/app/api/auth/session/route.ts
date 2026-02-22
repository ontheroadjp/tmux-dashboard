import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, backendUrl, getAuthToken, withAuthHeader } from "../../_shared";

export async function GET(req: NextRequest) {
  const token = getAuthToken(req);
  if (!token) {
    return NextResponse.json({ ok: false, authenticated: false, error: "unauthorized" }, { status: 401 });
  }

  const url = backendUrl("/api/auth/session");
  try {
    const resp = await fetch(url, {
      headers: withAuthHeader(token),
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
      { ok: false, authenticated: false, error: `backend request failed: ${message}` },
      { status: 502 }
    );
  }
}
