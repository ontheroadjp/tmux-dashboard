from __future__ import annotations

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from flask import Flask, jsonify, request

from .actions import execute_action
from .collectors import collect_network_state, collect_tmux_state
from .config import load_config


def create_app() -> Flask:
    app = Flask(__name__)
    cfg = load_config()
    serializer = URLSafeTimedSerializer(cfg.auth_secret)

    def issue_token(user: str) -> str:
        return serializer.dumps({"sub": user})

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
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        return response

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"ok": True})

    @app.route("/api/auth/login", methods=["POST"])
    def auth_login():
        payload = request.get_json(silent=True) or {}
        user = str(payload.get("user", "")).strip()
        password = str(payload.get("password", "")).strip()

        if user != cfg.auth_user or password != cfg.auth_password:
            return jsonify({"ok": False, "error": "invalid credentials"}), 401

        token = issue_token(user)
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
            return jsonify(result), 400

        return jsonify(result)

    return app


app = create_app()
