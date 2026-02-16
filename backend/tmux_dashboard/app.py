from __future__ import annotations

from flask import Flask, jsonify, request

from .actions import execute_action
from .collectors import collect_network_state, collect_tmux_state
from .config import load_config


def create_app() -> Flask:
    app = Flask(__name__)
    cfg = load_config()

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        return response

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"ok": True})

    @app.route("/api/snapshot", methods=["GET"])
    def snapshot():
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

        if action not in cfg.allowed_actions:
            return jsonify({"ok": False, "error": f"action '{action}' is disabled"}), 403

        payload = request.get_json(silent=True) or {}
        result = execute_action(action, payload)
        if not result.get("ok"):
            return jsonify(result), 400

        return jsonify(result)

    return app


app = create_app()
