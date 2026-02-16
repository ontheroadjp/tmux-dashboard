from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Set


DEFAULT_ACTIONS = {
    "send_keys",
    "select_pane",
    "select_window",
    "switch_client",
    "kill_pane",
    "kill_window",
    "kill_session",
    "new_window",
    "split_window",
}


@dataclass(frozen=True)
class AppConfig:
    allowed_actions: Set[str]


def load_config() -> AppConfig:
    raw = os.getenv("DASHBOARD_ALLOWED_ACTIONS", "all").strip()
    if not raw or raw.lower() == "all":
        allowed = set(DEFAULT_ACTIONS)
    else:
        allowed = {item.strip() for item in raw.split(",") if item.strip()}

    return AppConfig(allowed_actions=allowed)
