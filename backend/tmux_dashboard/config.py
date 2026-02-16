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
    auth_user: str
    auth_password: str
    auth_secret: str
    auth_token_ttl_sec: int


def load_config() -> AppConfig:
    raw = os.getenv("DASHBOARD_ALLOWED_ACTIONS", "all").strip()
    if not raw or raw.lower() == "all":
        allowed = set(DEFAULT_ACTIONS)
    else:
        allowed = {item.strip() for item in raw.split(",") if item.strip()}

    auth_user = os.getenv("DASHBOARD_AUTH_USER", "admin").strip()
    auth_password = os.getenv("DASHBOARD_AUTH_PASSWORD", "admin").strip()
    auth_secret = os.getenv("DASHBOARD_AUTH_SECRET", "change-this-secret").strip()
    ttl_raw = os.getenv("DASHBOARD_AUTH_TOKEN_TTL_SEC", "86400").strip()
    try:
        ttl = int(ttl_raw)
    except ValueError:
        ttl = 86400

    return AppConfig(
        allowed_actions=allowed,
        auth_user=auth_user,
        auth_password=auth_password,
        auth_secret=auth_secret,
        auth_token_ttl_sec=max(ttl, 60),
    )
