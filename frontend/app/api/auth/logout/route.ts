import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, backendUrl, getAuthToken, withAuthHeader } from "../../_shared";

export async function POST(req: NextRequest) {
  const token = getAuthToken(req);
  const url = backendUrl("/api/auth/logout");

  try {
    if (token) {
      await fetch(url, {
        method: "POST",
        headers: withAuthHeader(token),
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
