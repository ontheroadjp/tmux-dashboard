from __future__ import annotations

import subprocess
from typing import Dict, List


def _run_tmux(args: List[str]) -> Dict[str, object]:
    completed = subprocess.run(["tmux", *args], check=False, capture_output=True, text=True)
    if completed.returncode != 0:
        return {
            "ok": False,
            "stdout": completed.stdout.strip(),
            "stderr": completed.stderr.strip(),
            "returncode": completed.returncode,
        }

    return {
        "ok": True,
        "stdout": completed.stdout.strip(),
        "stderr": completed.stderr.strip(),
        "returncode": 0,
    }


def execute_action(action: str, payload: Dict[str, object]) -> Dict[str, object]:
    if action == "send_keys":
        target = str(payload.get("target_pane", "")).strip()
        keys = payload.get("keys", "")
        if not target:
            return {"ok": False, "error": "target_pane is required"}

        if isinstance(keys, list):
            key_args = [str(item) for item in keys]
        else:
            key_args = [str(keys)]

        # Literal mode is expressed as ["-l", "<text>"] from frontend.
        # Use explicit tmux option placement to avoid argument parsing ambiguity.
        if key_args and key_args[0] == "-l":
            literal_text = key_args[1] if len(key_args) > 1 else ""
            return _run_tmux(["send-keys", "-l", "-t", target, literal_text])

        return _run_tmux(["send-keys", "-t", target, *key_args])

    if action == "select_pane":
        target = str(payload.get("target_pane", "")).strip()
        if not target:
            return {"ok": False, "error": "target_pane is required"}
        return _run_tmux(["select-pane", "-t", target])

    if action == "select_window":
        target = str(payload.get("target_window", "")).strip()
        if not target:
            return {"ok": False, "error": "target_window is required"}
        return _run_tmux(["select-window", "-t", target])

    if action == "switch_client":
        target = str(payload.get("target_session", "")).strip()
        if not target:
            return {"ok": False, "error": "target_session is required"}
        return _run_tmux(["switch-client", "-t", target])

    if action == "kill_pane":
        target = str(payload.get("target_pane", "")).strip()
        if not target:
            return {"ok": False, "error": "target_pane is required"}
        return _run_tmux(["kill-pane", "-t", target])

    if action == "kill_window":
        target = str(payload.get("target_window", "")).strip()
        if not target:
            return {"ok": False, "error": "target_window is required"}
        return _run_tmux(["kill-window", "-t", target])

    if action == "kill_session":
        target = str(payload.get("target_session", "")).strip()
        if not target:
            return {"ok": False, "error": "target_session is required"}
        return _run_tmux(["kill-session", "-t", target])

    if action == "new_window":
        args = ["new-window"]
        target_session = str(payload.get("target_session", "")).strip()
        window_name = str(payload.get("window_name", "")).strip()
        command = str(payload.get("command", "")).strip()
        if target_session:
            args.extend(["-t", target_session])
        if window_name:
            args.extend(["-n", window_name])
        if command:
            args.append(command)
        return _run_tmux(args)

    if action == "split_window":
        args = ["split-window"]
        target_pane = str(payload.get("target_pane", "")).strip()
        direction = str(payload.get("direction", "vertical")).strip()
        percentage = str(payload.get("percentage", "")).strip()
        command = str(payload.get("command", "")).strip()

        if direction == "horizontal":
            args.append("-h")
        else:
            args.append("-v")

        if target_pane:
            args.extend(["-t", target_pane])
        if percentage:
            args.extend(["-p", percentage])
        if command:
            args.append(command)

        return _run_tmux(args)

    return {"ok": False, "error": f"unsupported action: {action}"}
