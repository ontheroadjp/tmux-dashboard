from __future__ import annotations

import subprocess
from typing import Callable, Dict, List

TMUX_COMMAND_TIMEOUT_SEC = 5


def _run_tmux(args: List[str]) -> Dict[str, object]:
    try:
        completed = subprocess.run(
            ["tmux", *args],
            check=False,
            capture_output=True,
            text=True,
            timeout=TMUX_COMMAND_TIMEOUT_SEC,
        )
    except subprocess.TimeoutExpired as e:
        return {
            "ok": False,
            "stdout": (e.stdout or "").strip(),
            "stderr": (e.stderr or "tmux command timed out").strip(),
            "returncode": 124,
            "code": "TMUX_ACTION_TIMEOUT",
        }
    if completed.returncode != 0:
        return {
            "ok": False,
            "stdout": completed.stdout.strip(),
            "stderr": completed.stderr.strip(),
            "returncode": completed.returncode,
            "code": "TMUX_ACTION_FAILED",
        }

    return {
        "ok": True,
        "stdout": completed.stdout.strip(),
        "stderr": completed.stderr.strip(),
        "returncode": 0,
    }


def _required_text(payload: Dict[str, object], key: str) -> str:
    value = str(payload.get(key, "")).strip()
    return value


def _action_send_keys(payload: Dict[str, object]) -> Dict[str, object]:
    target = _required_text(payload, "target_pane")
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


def _action_select_pane(payload: Dict[str, object]) -> Dict[str, object]:
    target = _required_text(payload, "target_pane")
    if not target:
        return {"ok": False, "error": "target_pane is required"}
    return _run_tmux(["select-pane", "-t", target])


def _action_select_window(payload: Dict[str, object]) -> Dict[str, object]:
    target = _required_text(payload, "target_window")
    if not target:
        return {"ok": False, "error": "target_window is required"}
    return _run_tmux(["select-window", "-t", target])


def _action_switch_client(payload: Dict[str, object]) -> Dict[str, object]:
    target = _required_text(payload, "target_session")
    if not target:
        return {"ok": False, "error": "target_session is required"}
    return _run_tmux(["switch-client", "-t", target])


def _action_kill_pane(payload: Dict[str, object]) -> Dict[str, object]:
    target = _required_text(payload, "target_pane")
    if not target:
        return {"ok": False, "error": "target_pane is required"}
    return _run_tmux(["kill-pane", "-t", target])


def _action_kill_window(payload: Dict[str, object]) -> Dict[str, object]:
    target = _required_text(payload, "target_window")
    if not target:
        return {"ok": False, "error": "target_window is required"}
    return _run_tmux(["kill-window", "-t", target])


def _action_kill_session(payload: Dict[str, object]) -> Dict[str, object]:
    target = _required_text(payload, "target_session")
    if not target:
        return {"ok": False, "error": "target_session is required"}
    return _run_tmux(["kill-session", "-t", target])


def _action_new_window(payload: Dict[str, object]) -> Dict[str, object]:
    args = ["new-window"]
    target_session = _required_text(payload, "target_session")
    window_name = _required_text(payload, "window_name")
    command = _required_text(payload, "command")
    if target_session:
        args.extend(["-t", target_session])
    if window_name:
        args.extend(["-n", window_name])
    if command:
        args.append(command)
    return _run_tmux(args)


def _action_split_window(payload: Dict[str, object]) -> Dict[str, object]:
    args = ["split-window"]
    target_pane = _required_text(payload, "target_pane")
    direction = _required_text(payload, "direction") or "vertical"
    percentage = _required_text(payload, "percentage")
    command = _required_text(payload, "command")

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


ACTION_HANDLERS: Dict[str, Callable[[Dict[str, object]], Dict[str, object]]] = {
    "send_keys": _action_send_keys,
    "select_pane": _action_select_pane,
    "select_window": _action_select_window,
    "switch_client": _action_switch_client,
    "kill_pane": _action_kill_pane,
    "kill_window": _action_kill_window,
    "kill_session": _action_kill_session,
    "new_window": _action_new_window,
    "split_window": _action_split_window,
}


def execute_action(action: str, payload: Dict[str, object]) -> Dict[str, object]:
    handler = ACTION_HANDLERS.get(action)
    if handler is None:
        return {"ok": False, "error": f"unsupported action: {action}"}
    return handler(payload)
