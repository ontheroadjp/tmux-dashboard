from __future__ import annotations

from flask import Flask

from .actions import execute_action
from .auth import AuthService
from .cert_dashboard import CertDashboardService
from .collectors import collect_network_state, collect_pane_detail, collect_tmux_state
from .config import load_config
from .routes import register_routes


def create_app() -> Flask:
    app = Flask(__name__)
    cfg = load_config()
    auth = AuthService(cfg)
    cert_dashboard = CertDashboardService(cfg.cert_dashboard_data_file)
    app.config["DASHBOARD_DEBUG"] = cfg.debug
    register_routes(
        app,
        cfg,
        auth,
        cert_dashboard,
        execute_action_fn=execute_action,
        collect_tmux_state_fn=collect_tmux_state,
        collect_network_state_fn=collect_network_state,
        collect_pane_detail_fn=collect_pane_detail,
    )
    return app


app = create_app()
