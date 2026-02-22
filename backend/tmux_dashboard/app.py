from __future__ import annotations

from collections import defaultdict, deque
from time import time

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from flask import Flask, jsonify, request

from .actions import execute_action
from .collectors import collect_network_state, collect_pane_detail, collect_tmux_state
from .config import load_config


def create_app() -> Flask:
    app = Flask(__name__)
    cfg = load_config()
    serializer = URLSafeTimedSerializer(cfg.auth_secret)
    app.config["DASHBOARD_DEBUG"] = cfg.debug
    login_attempts: dict[str, deque[float]] = defaultdict(deque)
    login_lock_until: dict[str, float] = {}

    def issue_token(user: str) -> str:
        return serializer.dumps({"sub": user})

    def client_ip() -> str:
        return request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip() or "unknown"

    def is_login_locked(ip: str, now: float) -> bool:
        return login_lock_until.get(ip, 0) > now

    def register_login_failure(ip: str, now: float) -> None:
        attempts = login_attempts[ip]
        attempts.append(now)
        window_start = now - cfg.login_window_sec
        while attempts and attempts[0] < window_start:
            attempts.popleft()
        if len(attempts) >= cfg.login_attempt_limit:
            login_lock_until[ip] = now + cfg.login_lock_sec
            attempts.clear()

    def parse_bearer_token() -> str:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return ""
        return auth_header.removeprefix("Bearer ").strip()

    def authenticate_request() -> str | None:
        token = parse_bearer_token()
        if not token:
            return None

        try:
            payload = serializer.loads(token, max_age=cfg.auth_token_ttl_sec)
        except (BadSignature, SignatureExpired):
            return None

        user = str(payload.get("sub", "")).strip()
        if not user:
            return None
        return user

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin", "")
        if cfg.cors_origins and origin in cfg.cors_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        return response

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"ok": True})

    @app.route("/api/auth/login", methods=["POST"])
    def auth_login():
        ip = client_ip()
        now = time()
        if is_login_locked(ip, now):
            app.logger.warning("auth.login.locked ip=%s", ip)
            return jsonify({"ok": False, "error": "too many attempts, try again later"}), 429

        payload = request.get_json(silent=True) or {}
        user = str(payload.get("user", "")).strip()
        password = str(payload.get("password", "")).strip()

        if user != cfg.auth_user or password != cfg.auth_password:
            register_login_failure(ip, now)
            app.logger.warning("auth.login.failed ip=%s user=%s", ip, user or "<empty>")
            return jsonify({"ok": False, "error": "invalid credentials"}), 401

        token = issue_token(user)
        login_attempts.pop(ip, None)
        login_lock_until.pop(ip, None)
        app.logger.info("auth.login.success ip=%s user=%s", ip, user)
        return jsonify(
            {
                "ok": True,
                "token": token,
                "token_type": "Bearer",
                "expires_in": cfg.auth_token_ttl_sec,
                "user": user,
            }
        )

    @app.route("/api/auth/session", methods=["GET"])
    def auth_session():
        user = authenticate_request()
        if not user:
            return jsonify({"ok": False, "authenticated": False, "error": "unauthorized"}), 401

        return jsonify({"ok": True, "authenticated": True, "user": user})

    @app.route("/api/auth/logout", methods=["POST"])
    def auth_logout():
        return jsonify({"ok": True})

    @app.route("/api/snapshot", methods=["GET"])
    def snapshot():
        user = authenticate_request()
        if not user:
            return jsonify({"ok": False, "error": "unauthorized"}), 401

        return jsonify(
            {
                "tmux": collect_tmux_state(),
                "network": collect_network_state(),
                "allowed_actions": sorted(cfg.allowed_actions),
            }
        )

    @app.route("/api/panes/<pane_id>", methods=["GET"])
    def pane_detail(pane_id: str):
        user = authenticate_request()
        if not user:
            return jsonify({"ok": False, "error": "unauthorized"}), 401

        detail = collect_pane_detail(pane_id)
        if detail is None:
            return jsonify({"ok": False, "error": f"pane '{pane_id}' not found"}), 404

        return jsonify({"ok": True, **detail})

    @app.route("/api/actions/<action>", methods=["POST", "OPTIONS"])
    def actions(action: str):
        if request.method == "OPTIONS":
            return ("", 204)

        user = authenticate_request()
        if not user:
            return jsonify({"ok": False, "error": "unauthorized"}), 401

        if action not in cfg.allowed_actions:
            return jsonify({"ok": False, "error": f"action '{action}' is disabled"}), 403

        payload = request.get_json(silent=True) or {}
        result = execute_action(action, payload)
        if not result.get("ok"):
            app.logger.warning(
                "action.failed user=%s action=%s returncode=%s code=%s stderr=%s stdout=%s",
                user,
                action,
                result.get("returncode"),
                result.get("code", "TMUX_ACTION_FAILED"),
                result.get("stderr", ""),
                result.get("stdout", ""),
            )
            return (
                jsonify(
                    {
                        "ok": False,
                        "error": "action failed",
                        "code": result.get("code", "TMUX_ACTION_FAILED"),
                    }
                ),
                400,
            )

        app.logger.info("action.success user=%s action=%s", user, action)

        return jsonify(result)

    return app


app = create_app()
