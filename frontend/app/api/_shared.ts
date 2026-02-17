import { NextRequest } from "next/server";

export const BACKEND_API_BASE = process.env.BACKEND_API_BASE ?? "http://127.0.0.1:5001";
export const AUTH_COOKIE_NAME = "tmux_dashboard_token";

export function backendUrl(path: string): string {
  return `${BACKEND_API_BASE}${path}`;
}

export function getAuthToken(req: NextRequest): string {
  return req.cookies.get(AUTH_COOKIE_NAME)?.value ?? "";
}

export function withAuthHeader(token: string, base: Record<string, string> = {}): Record<string, string> {
  if (!token) {
    return base;
  }
  return { ...base, Authorization: `Bearer ${token}` };
}
