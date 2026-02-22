from __future__ import annotations

import re
import shutil
import subprocess
from typing import Any, Dict, List

COMMAND_TIMEOUT_SEC = 5
SENSITIVE_PATTERNS = [
    re.compile(r"(?i)(authorization\s*:\s*bearer)\s+([^\s]+)"),
    re.compile(r"(?i)(password|passwd|pwd)\s*([=:])\s*([^\s]+)"),
    re.compile(r"(?i)(token|secret|api[_-]?key)\s*([=:])\s*([^\s]+)"),
    re.compile(r"(?i)(bearer)\s+([^\s]+)"),
]


def _mask_sensitive_text(text: str) -> str:
    masked = text
    for pattern in SENSITIVE_PATTERNS:
        if "authorization" in pattern.pattern.lower() or pattern.pattern.lower().startswith("(?i)(bearer)"):
            masked = pattern.sub(r"\1 [REDACTED]", masked)
        else:
            masked = pattern.sub(r"\1\2[REDACTED]", masked)
    return masked


def _run_command(args: List[str]) -> str:
    try:
        completed = subprocess.run(args, check=False, capture_output=True, text=True, timeout=COMMAND_TIMEOUT_SEC)
    except subprocess.TimeoutExpired:
        return ""
    if completed.returncode != 0:
        return ""
    return completed.stdout.strip()


def _ps_details(pid: str) -> Dict[str, str]:
    if not pid or pid == "0":
        return {}

    out = _run_command(["ps", "-p", pid, "-o", "pid=,ppid=,user=,etime=,command="])
    if not out:
        return {}

    parts = out.split(None, 4)
    if len(parts) < 5:
        return {}

    return {
        "pid": parts[0],
        "ppid": parts[1],
        "user": parts[2],
        "elapsed": parts[3],
        "command": _mask_sensitive_text(parts[4]),
    }


def collect_tmux_state() -> Dict[str, object]:
    if shutil.which("tmux") is None:
        return {
            "available": False,
            "running": False,
            "sessions": [],
            "error": "tmux command not found",
        }

    sessions_raw = _run_command(
        ["tmux", "list-sessions", "-F", "#{session_id}\t#{session_name}\t#{session_windows}\t#{session_attached}"]
    )
    if not sessions_raw:
        return {
            "available": True,
            "running": False,
            "sessions": [],
            "error": "no running tmux server",
        }

    windows_raw = _run_command(
        [
            "tmux",
            "list-windows",
            "-a",
            "-F",
            "#{session_name}\t#{window_id}\t#{window_index}\t#{window_name}\t#{window_active}\t#{window_panes}",
        ]
    )
    panes_raw = _run_command(
        [
            "tmux",
            "list-panes",
            "-a",
            "-F",
            "#{session_name}\t#{window_id}\t#{pane_id}\t#{pane_index}\t#{pane_active}\t#{pane_pid}\t#{pane_current_command}\t#{pane_current_path}\t#{pane_title}",
        ]
    )

    sessions: Dict[str, Dict[str, object]] = {}
    for line in sessions_raw.splitlines():
        parts = line.split("\t")
        if len(parts) != 4:
            continue
        _, name, window_count, attached = parts
        sessions[name] = {
            "name": name,
            "window_count": int(window_count),
            "attached": attached == "1",
            "windows": [],
        }

    windows: Dict[str, Dict[str, object]] = {}
    for line in windows_raw.splitlines():
        parts = line.split("\t")
        if len(parts) != 6:
            continue

        session_name, window_id, window_index, window_name, window_active, pane_count = parts
        window = {
            "id": window_id,
            "index": int(window_index),
            "name": window_name,
            "active": window_active == "1",
            "pane_count": int(pane_count),
            "panes": [],
        }
        windows[window_id] = window
        if session_name in sessions:
            sessions[session_name]["windows"].append(window)

    for line in panes_raw.splitlines():
        parts = line.split("\t")
        if len(parts) != 9:
            continue

        _, window_id, pane_id, pane_index, pane_active, pane_pid, current_cmd, current_path, pane_title = parts
        pane = {
            "id": pane_id,
            "index": int(pane_index),
            "active": pane_active == "1",
            "pid": pane_pid,
            "current_command": current_cmd,
            "current_path": current_path,
            "title": pane_title,
            "process": _ps_details(pane_pid),
        }
        window = windows.get(window_id)
        if window:
            window["panes"].append(pane)

    return {
        "available": True,
        "running": True,
        "sessions": sorted(sessions.values(), key=lambda item: item["name"]),
        "error": "",
    }


def collect_network_state() -> Dict[str, object]:
    listening: List[Dict[str, str]] = []
    ssh_connections: List[Dict[str, str]] = []
    ssh_tunnels: List[Dict[str, object]] = []

    lsof_output = _run_command(["lsof", "-nP", "-iTCP", "-sTCP:LISTEN"])
    for idx, line in enumerate(lsof_output.splitlines()):
        if idx == 0:
            continue
        parts = line.split()
        if len(parts) < 9:
            continue
        listening.append(
            {
                "command": parts[0],
                "pid": parts[1],
                "user": parts[2],
                "address": parts[8],
            }
        )

    ps_output = _run_command(["ps", "-axo", "pid=,ppid=,user=,command="])
    for line in ps_output.splitlines():
        parts = line.split(None, 3)
        if len(parts) != 4:
            continue

        pid, ppid, user, command = parts
        if "ssh" not in command:
            continue

        masked_command = _mask_sensitive_text(command)
        record = {"pid": pid, "ppid": ppid, "user": user, "command": masked_command}
        ssh_connections.append(record)

        has_tunnel = any(flag in command for flag in (" -L ", " -R ", " -D ", " -W "))
        if has_tunnel:
            ssh_tunnels.append(
                {
                    "pid": pid,
                    "user": user,
                    "command": masked_command,
                    "kind": "tunnel",
                }
            )

    return {
        "listening_servers": listening,
        "ssh_connections": ssh_connections,
        "ssh_tunnels": ssh_tunnels,
    }


def _capture_pane_output(pane_id: str, lines: int = 200) -> str:
    if not pane_id:
        return ""

    try:
        completed = subprocess.run(
            ["tmux", "capture-pane", "-p", "-t", pane_id, "-S", f"-{max(lines, 1)}"],
            check=False,
            capture_output=True,
            text=True,
            timeout=COMMAND_TIMEOUT_SEC,
        )
    except subprocess.TimeoutExpired:
        return ""
    if completed.returncode != 0:
        return ""
    return completed.stdout


def collect_pane_detail(pane_id: str) -> Dict[str, Any] | None:
    pane_id = pane_id.strip()
    if not pane_id:
        return None

    tmux_state = collect_tmux_state()
    if not tmux_state.get("running"):
        return None

    sessions = tmux_state.get("sessions", [])
    for session in sessions:
        windows = session.get("windows", [])
        for window in windows:
            panes = window.get("panes", [])
            for pane in panes:
                if pane.get("id") != pane_id:
                    continue
                return {
                    "session": {
                        "name": session.get("name", ""),
                        "attached": bool(session.get("attached", False)),
                    },
                    "window": {
                        "id": window.get("id", ""),
                        "index": int(window.get("index", 0)),
                        "name": window.get("name", ""),
                        "active": bool(window.get("active", False)),
                    },
                    "pane": pane,
                    "output": _capture_pane_output(pane_id),
                }

    return None
