from __future__ import annotations

import ipaddress
from typing import Callable

from flask import Flask, jsonify, request

from .auth import AuthService
from .cert_dashboard import CertDashboardService
from .config import AppConfig


def _is_loopback_ip(value: str) -> bool:
    try:
        return ipaddress.ip_address(value).is_loopback
    except ValueError:
        return False


def _resolve_client_ip(req) -> str:
    remote_addr = (req.remote_addr or "").strip()
    if _is_loopback_ip(remote_addr):
        forwarded_for = req.headers.get("X-Forwarded-For", "").strip()
        if forwarded_for:
            forwarded_ip = forwarded_for.split(",")[0].strip()
            if forwarded_ip:
                return forwarded_ip
        real_ip = req.headers.get("X-Real-IP", "").strip()
        if real_ip:
            return real_ip
    return remote_addr or "unknown"


def _authenticate_request(req, auth: AuthService) -> str | None:
    return auth.authenticate_bearer_token(req.headers.get("Authorization", ""))


def _add_cors_headers(req, response, cfg: AppConfig):
    origin = req.headers.get("Origin", "")
    if cfg.cors_origins and origin in cfg.cors_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response


def _action_failed_response(code: str):
    return (
        jsonify(
            {
                "ok": False,
                "error": "action failed",
                "code": code,
            }
        ),
        400,
    )


def register_routes(
    app: Flask,
    cfg: AppConfig,
    auth: AuthService,
    cert_dashboard: CertDashboardService,
    *,
    execute_action_fn: Callable[[str, dict[str, object]], dict[str, object]],
    collect_tmux_state_fn: Callable[[], dict[str, object]],
    collect_network_state_fn: Callable[[], dict[str, object]],
    collect_pane_detail_fn: Callable[[str], dict[str, object] | None],
    ) -> None:
    def client_ip() -> str:
        return _resolve_client_ip(request)

    def authenticate_request() -> str | None:
        return _authenticate_request(request, auth)

    @app.after_request
    def add_cors_headers(response):
        return _add_cors_headers(request, response, cfg)

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
            return _action_failed_response(str(result.get("code", "TMUX_ACTION_FAILED")))

        app.logger.info("action.success user=%s action=%s", user, action)

        return jsonify(result)

    @app.route("/api/certs/devices", methods=["GET"])
    def cert_devices():
        user = authenticate_request()
        if not user:
            return jsonify({"ok": False, "error": "unauthorized"}), 401
        return jsonify({"ok": True, "devices": cert_dashboard.list_devices()})

    @app.route("/api/certs/requests", methods=["GET", "POST"])
    def cert_requests():
        user = authenticate_request()
        if not user:
            return jsonify({"ok": False, "error": "unauthorized"}), 401

        if request.method == "GET":
            return jsonify({"ok": True, "requests": cert_dashboard.list_requests()})

        payload = request.get_json(silent=True) or {}
        device_name = str(payload.get("device_name", "")).strip()
        if not device_name:
            return jsonify({"ok": False, "error": "device_name is required"}), 400
        platform = str(payload.get("platform", "")).strip()
        note = str(payload.get("note", "")).strip()
        record = cert_dashboard.create_request(actor=user, device_name=device_name, platform=platform, note=note)
        return jsonify({"ok": True, "request": record}), 201

    @app.route("/api/certs/requests/<request_id>/mark-issued", methods=["POST"])
    def cert_mark_issued(request_id: str):
        user = authenticate_request()
        if not user:
            return jsonify({"ok": False, "error": "unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        issued_at = str(payload.get("issued_at", "")).strip()
        expires_at = str(payload.get("expires_at", "")).strip()
        cert_cn = str(payload.get("cert_cn", "")).strip()
        if not issued_at or not expires_at or not cert_cn:
            return jsonify({"ok": False, "error": "issued_at, expires_at and cert_cn are required"}), 400
        updated = cert_dashboard.mark_request_issued(
            actor=user,
            request_id=request_id,
            issued_at=issued_at,
            expires_at=expires_at,
            cert_cn=cert_cn,
        )
        if updated is None:
            return jsonify({"ok": False, "error": "request not found"}), 404
        return jsonify({"ok": True, "request": updated})

    @app.route("/api/certs/links", methods=["GET", "POST"])
    def cert_links():
        user = authenticate_request()
        if not user:
            return jsonify({"ok": False, "error": "unauthorized"}), 401

        if request.method == "GET":
            return jsonify({"ok": True, "links": cert_dashboard.list_links()})

        payload = request.get_json(silent=True) or {}
        request_id = str(payload.get("request_id", "")).strip()
        if not request_id:
            return jsonify({"ok": False, "error": "request_id is required"}), 400
        note = str(payload.get("note", "")).strip()
        raw_expires = str(payload.get("expires_in_sec", "600")).strip()
        try:
            expires_in_sec = int(raw_expires)
        except ValueError:
            expires_in_sec = 600
        link = cert_dashboard.create_distribution_link(
            actor=user, request_id=request_id, expires_in_sec=expires_in_sec, note=note
        )
        if link is None:
            return jsonify({"ok": False, "error": "request not found"}), 404
        return jsonify({"ok": True, "link": link}), 201

    @app.route("/api/certs/links/<link_id>/revoke", methods=["POST"])
    def cert_revoke_link(link_id: str):
        user = authenticate_request()
        if not user:
            return jsonify({"ok": False, "error": "unauthorized"}), 401

        link = cert_dashboard.revoke_link(actor=user, link_id=link_id)
        if link is None:
            return jsonify({"ok": False, "error": "link not found"}), 404
        return jsonify({"ok": True, "link": link})

    @app.route("/api/certs/audit", methods=["GET"])
    def cert_audit():
        user = authenticate_request()
        if not user:
            return jsonify({"ok": False, "error": "unauthorized"}), 401
        return jsonify({"ok": True, "audit": cert_dashboard.list_audit()})

    @app.route("/api/certs/distribution/<token>", methods=["GET"])
    def cert_distribution(token: str):
        resolved = cert_dashboard.resolve_distribution_token(token)
        if resolved is None:
            return jsonify({"ok": False, "error": "link not found"}), 404
        return jsonify({"ok": True, "distribution": resolved})
