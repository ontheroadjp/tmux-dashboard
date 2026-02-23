from __future__ import annotations

import os
import secrets
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
    auth_require_secret_in_prod: bool
    debug: bool
    cors_origins: Set[str]
    login_attempt_limit: int
    login_window_sec: int
    login_lock_sec: int
    cert_dashboard_data_file: str


def _backend_root() -> str:
    return os.path.dirname(os.path.dirname(__file__))


def _parse_bool(value: str, default: bool = False) -> bool:
    raw = value.strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _load_env_file() -> None:
    env_file = os.getenv("DASHBOARD_ENV_FILE", "").strip()
    if not env_file:
        env_name = os.getenv("DASHBOARD_ENV", "dev").strip().lower()
        file_name = ".env.prod" if env_name == "prod" else ".env.dev"
        env_file = os.path.join(_backend_root(), file_name)

    if not os.path.exists(env_file):
        return

    with open(env_file, encoding="utf-8") as f:
        for line in f:
            raw = line.strip()
            if not raw or raw.startswith("#") or "=" not in raw:
                continue
            key, value = raw.split("=", 1)
            key = key.strip()
            value = value.strip()
            if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                value = value[1:-1]
            if key:
                os.environ.setdefault(key, value)


def load_config() -> AppConfig:
    _load_env_file()
    env_name = os.getenv("DASHBOARD_ENV", "dev").strip().lower()

    raw = os.getenv("DASHBOARD_ALLOWED_ACTIONS", "all").strip()
    if not raw or raw.lower() == "all":
        allowed = set(DEFAULT_ACTIONS)
    else:
        allowed = {item.strip() for item in raw.split(",") if item.strip()}

    auth_user = os.getenv("DASHBOARD_AUTH_USER", "").strip()
    auth_password = os.getenv("DASHBOARD_AUTH_PASSWORD", "").strip()
    if not auth_user or not auth_password:
        raise ValueError("DASHBOARD_AUTH_USER and DASHBOARD_AUTH_PASSWORD must be set")
    auth_secret = os.getenv("DASHBOARD_AUTH_SECRET", "").strip()
    auth_require_secret_in_prod = _parse_bool(os.getenv("DASHBOARD_AUTH_REQUIRE_SECRET_IN_PROD", "1"), default=True)
    if not auth_secret:
        if env_name == "prod" and auth_require_secret_in_prod:
            raise ValueError("DASHBOARD_AUTH_SECRET must be set in production")
        # Generate a strong per-process secret when env is not supplied.
        auth_secret = secrets.token_urlsafe(48)
    ttl_raw = os.getenv("DASHBOARD_AUTH_TOKEN_TTL_SEC", "86400").strip()
    try:
        ttl = int(ttl_raw)
    except ValueError:
        ttl = 86400

    debug = _parse_bool(os.getenv("DASHBOARD_DEBUG", ""), default=False)
    cors_raw = os.getenv("DASHBOARD_CORS_ORIGINS", "").strip()
    if cors_raw:
        cors_origins = {item.strip() for item in cors_raw.split(",") if item.strip()}
    else:
        cors_origins = set()
    login_attempt_limit_raw = os.getenv("DASHBOARD_LOGIN_ATTEMPT_LIMIT", "5").strip()
    login_window_sec_raw = os.getenv("DASHBOARD_LOGIN_WINDOW_SEC", "600").strip()
    login_lock_sec_raw = os.getenv("DASHBOARD_LOGIN_LOCK_SEC", "900").strip()
    cert_dashboard_data_file = os.getenv(
        "DASHBOARD_CERT_DASHBOARD_DATA_FILE",
        os.path.join(_backend_root(), "data", "cert_dashboard.json"),
    ).strip()
    try:
        login_attempt_limit = int(login_attempt_limit_raw)
    except ValueError:
        login_attempt_limit = 5
    try:
        login_window_sec = int(login_window_sec_raw)
    except ValueError:
        login_window_sec = 600
    try:
        login_lock_sec = int(login_lock_sec_raw)
    except ValueError:
        login_lock_sec = 900

    return AppConfig(
        allowed_actions=allowed,
        auth_user=auth_user,
        auth_password=auth_password,
        auth_secret=auth_secret,
        auth_token_ttl_sec=max(ttl, 60),
        auth_require_secret_in_prod=auth_require_secret_in_prod,
        debug=debug,
        cors_origins=cors_origins,
        login_attempt_limit=max(login_attempt_limit, 1),
        login_window_sec=max(login_window_sec, 60),
        login_lock_sec=max(login_lock_sec, 60),
        cert_dashboard_data_file=cert_dashboard_data_file,
    )
