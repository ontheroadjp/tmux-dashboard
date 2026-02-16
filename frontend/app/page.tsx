"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_BASE, fetchSnapshot, postAction, type Snapshot } from "../lib/api";

const POLL_MS = 3000;

export default function Page() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const [targetPane, setTargetPane] = useState("");
  const [keys, setKeys] = useState("Enter");
  const [targetWindow, setTargetWindow] = useState("");
  const [targetSession, setTargetSession] = useState("");

  async function load() {
    try {
      setError("");
      const data = await fetchSnapshot();
      setSnapshot(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to fetch snapshot");
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(timer);
  }, []);

  async function runAction(action: string, payload: Record<string, unknown>) {
    try {
      setBusy(true);
      setError("");
      await postAction(action, payload);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "action failed");
    } finally {
      setBusy(false);
    }
  }

  function onSendKeys(e: FormEvent) {
    e.preventDefault();
    runAction("send_keys", { target_pane: targetPane, keys });
  }

  function onSelectWindow(e: FormEvent) {
    e.preventDefault();
    runAction("select_window", { target_window: targetWindow });
  }

  function onSwitchSession(e: FormEvent) {
    e.preventDefault();
    runAction("switch_client", { target_session: targetSession });
  }

  const allowed = new Set(snapshot?.allowed_actions ?? []);

  return (
    <main className="page">
      <header>
        <h1>tmux dashboard</h1>
        <p>API: {API_BASE}</p>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel">
        <h2>Allowed Actions</h2>
        <div className="chips">
          {snapshot?.allowed_actions.map((item) => (
            <span key={item} className="chip">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>tmux</h2>
        {!snapshot ? <p>loading...</p> : null}
        {snapshot?.tmux.available === false ? <p>tmux not available</p> : null}
        {snapshot?.tmux.running === false ? <p>{snapshot.tmux.error || "tmux server is not running"}</p> : null}

        {snapshot?.tmux.sessions.map((session) => (
          <article key={session.name} className="session">
            <h3>
              {session.name} {session.attached ? "(attached)" : ""}
            </h3>
            {session.windows.map((window) => (
              <div key={window.id} className="window">
                <h4>
                  #{window.index} {window.name} {window.active ? "(active)" : ""}
                </h4>
                {window.panes.map((pane) => (
                  <div key={pane.id} className="pane">
                    <div>
                      pane {pane.id} {pane.active ? "(active)" : ""}
                    </div>
                    <div>cmd: {pane.current_command}</div>
                    <div>path: {pane.current_path}</div>
                    <div>title: {pane.title}</div>
                    <div>pid: {pane.pid}</div>
                    {pane.process.command ? <div>process: {pane.process.command}</div> : null}
                  </div>
                ))}
              </div>
            ))}
          </article>
        ))}
      </section>

      <section className="panel">
        <h2>Network</h2>

        <h3>Listening Servers</h3>
        <ul>
          {snapshot?.network.listening_servers.map((item, idx) => (
            <li key={`${item.pid}-${idx}`}>
              {item.command} (pid {item.pid}, user {item.user}) {item.address}
            </li>
          ))}
        </ul>

        <h3>SSH Connections</h3>
        <ul>
          {snapshot?.network.ssh_connections.map((item) => (
            <li key={item.pid}>
              pid {item.pid} / {item.command}
            </li>
          ))}
        </ul>

        <h3>SSH Tunnels</h3>
        <ul>
          {snapshot?.network.ssh_tunnels.map((item) => (
            <li key={item.pid}>
              pid {item.pid} / {item.command}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Actions</h2>

        <form onSubmit={onSendKeys}>
          <label>
            target pane
            <input value={targetPane} onChange={(e) => setTargetPane(e.target.value)} placeholder="%1" />
          </label>
          <label>
            keys
            <input value={keys} onChange={(e) => setKeys(e.target.value)} placeholder="Enter" />
          </label>
          <button type="submit" disabled={!allowed.has("send_keys") || busy}>
            send_keys
          </button>
        </form>

        <form onSubmit={onSelectWindow}>
          <label>
            target window
            <input value={targetWindow} onChange={(e) => setTargetWindow(e.target.value)} placeholder="session:1" />
          </label>
          <button type="submit" disabled={!allowed.has("select_window") || busy}>
            select_window
          </button>
        </form>

        <form onSubmit={onSwitchSession}>
          <label>
            target session
            <input value={targetSession} onChange={(e) => setTargetSession(e.target.value)} placeholder="session-name" />
          </label>
          <button type="submit" disabled={!allowed.has("switch_client") || busy}>
            switch_client
          </button>
        </form>

        <div className="quick-actions">
          <button onClick={() => runAction("kill_pane", { target_pane: targetPane })} disabled={!allowed.has("kill_pane") || busy}>
            kill_pane (target pane)
          </button>
          <button onClick={() => runAction("kill_window", { target_window: targetWindow })} disabled={!allowed.has("kill_window") || busy}>
            kill_window (target window)
          </button>
          <button
            onClick={() => runAction("kill_session", { target_session: targetSession })}
            disabled={!allowed.has("kill_session") || busy}
          >
            kill_session (target session)
          </button>
          <button onClick={() => runAction("new_window", { target_session: targetSession })} disabled={!allowed.has("new_window") || busy}>
            new_window
          </button>
          <button
            onClick={() => runAction("split_window", { target_pane: targetPane, direction: "vertical" })}
            disabled={!allowed.has("split_window") || busy}
          >
            split_window
          </button>
        </div>
      </section>
    </main>
  );
}
