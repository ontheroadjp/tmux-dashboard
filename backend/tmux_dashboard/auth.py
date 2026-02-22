from __future__ import annotations

from collections import defaultdict, deque
from time import time
from typing import Deque

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from .config import AppConfig


class AuthService:
    def __init__(self, cfg: AppConfig) -> None:
        self._cfg = cfg
        self._serializer = URLSafeTimedSerializer(cfg.auth_secret)
        self._login_attempts: dict[str, Deque[float]] = defaultdict(deque)
        self._login_lock_until: dict[str, float] = {}

    def now(self) -> float:
        return time()

    def issue_token(self, user: str) -> str:
        return self._serializer.dumps({"sub": user})

    def authenticate_bearer_token(self, auth_header: str) -> str | None:
        if not auth_header.startswith("Bearer "):
            return None
        token = auth_header.removeprefix("Bearer ").strip()
        if not token:
            return None

        try:
            payload = self._serializer.loads(token, max_age=self._cfg.auth_token_ttl_sec)
        except (BadSignature, SignatureExpired):
            return None

        user = str(payload.get("sub", "")).strip()
        return user or None

    def is_login_locked(self, ip: str, now_ts: float) -> bool:
        return self._login_lock_until.get(ip, 0) > now_ts

    def register_login_failure(self, ip: str, now_ts: float) -> None:
        attempts = self._login_attempts[ip]
        attempts.append(now_ts)
        window_start = now_ts - self._cfg.login_window_sec
        while attempts and attempts[0] < window_start:
            attempts.popleft()
        if len(attempts) >= self._cfg.login_attempt_limit:
            self._login_lock_until[ip] = now_ts + self._cfg.login_lock_sec
            attempts.clear()

    def register_login_success(self, ip: str) -> None:
        self._login_attempts.pop(ip, None)
        self._login_lock_until.pop(ip, None)
