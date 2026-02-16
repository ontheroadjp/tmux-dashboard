function resolveApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const host = window.location.hostname;
    return `${protocol}//${host}:5001`;
  }

  return "http://127.0.0.1:5001";
}

export const API_BASE = resolveApiBase();

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

export async function fetchSnapshot(): Promise<Snapshot> {
  const url = `${API_BASE}/api/snapshot`;
  let resp: Response;
  try {
    resp = await fetch(url, { cache: "no-store" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "network error";
    throw new Error(`snapshot request failed: ${msg} (${url})`);
  }
  if (!resp.ok) {
    throw new Error(`snapshot request failed: ${resp.status} (${url})`);
  }
  return (await resp.json()) as Snapshot;
}

export async function postAction(action: string, payload: Record<string, unknown>) {
  const url = `${API_BASE}/api/actions/${action}`;
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

  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(json.error ?? `action failed: ${resp.status} (${url})`);
  }
  return json;
}
