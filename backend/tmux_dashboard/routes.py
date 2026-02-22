from __future__ import annotations

from typing import Callable

from flask import Flask, jsonify, request

from .auth import AuthService
from .config import AppConfig


def register_routes(
    app: Flask,
    cfg: AppConfig,
    auth: AuthService,
    *,
    execute_action_fn: Callable[[str, dict[str, object]], dict[str, object]],
    collect_tmux_state_fn: Callable[[], dict[str, object]],
    collect_network_state_fn: Callable[[], dict[str, object]],
    collect_pane_detail_fn: Callable[[str], dict[str, object] | None],
) -> None:
    def client_ip() -> str:
        return request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip() or "unknown"

    def authenticate_request() -> str | None:
        return auth.authenticate_bearer_token(request.headers.get("Authorization", ""))

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
        now_ts = auth.now()
        if auth.is_login_locked(ip, now_ts):
            app.logger.warning("auth.login.locked ip=%s", ip)
            return jsonify({"ok": False, "error": "too many attempts, try again later"}), 429

        payload = request.get_json(silent=True) or {}
        user = str(payload.get("user", "")).strip()
        password = str(payload.get("password", "")).strip()

        if user != cfg.auth_user or password != cfg.auth_password:
            auth.register_login_failure(ip, now_ts)
            app.logger.warning("auth.login.failed ip=%s user=%s", ip, user or "<empty>")
            return jsonify({"ok": False, "error": "invalid credentials"}), 401

        token = auth.issue_token(user)
        auth.register_login_success(ip)
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
                "tmux": collect_tmux_state_fn(),
                "network": collect_network_state_fn(),
                "allowed_actions": sorted(cfg.allowed_actions),
            }
        )

    @app.route("/api/panes/<pane_id>", methods=["GET"])
    def pane_detail(pane_id: str):
        user = authenticate_request()
        if not user:
            return jsonify({"ok": False, "error": "unauthorized"}), 401

        detail = collect_pane_detail_fn(pane_id)
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
        result = execute_action_fn(action, payload)
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
