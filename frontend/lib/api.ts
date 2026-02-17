function resolveApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return "";
}

export const API_BASE = resolveApiBase();
export const API_LABEL = API_BASE ? API_BASE : "same-origin /api";

function buildApiUrl(path: string): string {
  if (!API_BASE) {
    return `/api${path}`;
  }
  return `${API_BASE}${path}`;
}

export type Snapshot = {
  allowed_actions: string[];
  tmux: {
    available: boolean;
    running: boolean;
    error: string;
    sessions: Array<{
      name: string;
      window_count: number;
      attached: boolean;
      windows: Array<{
        id: string;
        index: number;
        name: string;
        active: boolean;
        pane_count: number;
        panes: Array<{
          id: string;
          index: number;
          active: boolean;
          pid: string;
          current_command: string;
          current_path: string;
          title: string;
          process: {
            pid?: string;
            ppid?: string;
            user?: string;
            elapsed?: string;
            command?: string;
          };
        }>;
      }>;
    }>;
  };
  network: {
    listening_servers: Array<{ command: string; pid: string; user: string; address: string }>;
    ssh_connections: Array<{ pid: string; ppid: string; user: string; command: string }>;
    ssh_tunnels: Array<{ pid: string; user: string; command: string; kind: string }>;
  };
};

export type AuthSession = {
  authenticated: boolean;
  user: string;
};

export type PaneDetail = {
  session: {
    name: string;
    attached: boolean;
  };
  window: {
    id: string;
    index: number;
    name: string;
    active: boolean;
  };
  pane: {
    id: string;
    index: number;
    active: boolean;
    pid: string;
    current_command: string;
    current_path: string;
    title: string;
    process: {
      pid?: string;
      ppid?: string;
      user?: string;
      elapsed?: string;
      command?: string;
    };
  };
  output: string;
};

export async function fetchSnapshot(): Promise<Snapshot> {
  const url = buildApiUrl("/snapshot");
  let resp: Response;
  try {
    resp = await fetch(url, { cache: "no-store" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "network error";
    throw new Error(`snapshot request failed: ${msg} (${url})`);
  }
  if (!resp.ok) {
    if (resp.status === 401) {
      throw new Error("unauthorized");
    }
    throw new Error(`snapshot request failed: ${resp.status} (${url})`);
  }
  return (await resp.json()) as Snapshot;
}

export async function fetchPaneDetail(paneId: string): Promise<PaneDetail> {
  const encodedPaneId = encodeURIComponent(paneId);
  const url = buildApiUrl(`/panes/${encodedPaneId}`);
  let resp: Response;
  try {
    resp = await fetch(url, { cache: "no-store" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "network error";
    throw new Error(`pane detail request failed: ${msg} (${url})`);
  }
  if (!resp.ok) {
    if (resp.status === 401) {
      throw new Error("unauthorized");
    }
    throw new Error(`pane detail request failed: ${resp.status} (${url})`);
  }
  const json = (await resp.json()) as { ok: boolean } & PaneDetail;
  return {
    session: json.session,
    window: json.window,
    pane: json.pane,
    output: json.output,
  };
}

export async function postAction(action: string, payload: Record<string, unknown>) {
  const url = buildApiUrl(`/actions/${action}`);
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "network error";
    throw new Error(`action request failed: ${msg} (${url})`);
  }

  const json = (await resp.json().catch(() => ({}))) as {
    error?: string;
    stderr?: string;
    stdout?: string;
    returncode?: number;
  };
  if (!resp.ok) {
    if (resp.status === 401) {
      throw new Error("unauthorized");
    }
    const detail = json.stderr || json.error || json.stdout;
    throw new Error(detail ?? `action failed: ${resp.status} (${url})`);
  }
  return json;
}

export async function login(user: string, password: string): Promise<{ user: string; expires_in: number }> {
  const url = buildApiUrl("/auth/login");
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, password }),
  });
  const json = (await resp.json().catch(() => ({}))) as {
    ok?: boolean;
    user?: string;
    expires_in?: number;
    error?: string;
  };
  if (!resp.ok || !json.ok) {
    throw new Error(json.error ?? `login failed: ${resp.status} (${url})`);
  }
  return { user: json.user ?? "", expires_in: json.expires_in ?? 86400 };
}

export async function fetchSession(): Promise<AuthSession> {
  const url = buildApiUrl("/auth/session");
  const resp = await fetch(url, { cache: "no-store" });
  const json = (await resp.json().catch(() => ({}))) as {
    authenticated?: boolean;
    user?: string;
  };
  if (!resp.ok) {
    return { authenticated: false, user: "" };
  }
  return {
    authenticated: Boolean(json.authenticated),
    user: json.user ?? "",
  };
}

export async function logout(): Promise<void> {
  const url = buildApiUrl("/auth/logout");
  await fetch(url, { method: "POST" });
}
