import os

from tmux_dashboard import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("DASHBOARD_PORT", "5001"))
    debug = bool(app.config.get("DASHBOARD_DEBUG", False))
    app.run(host="127.0.0.1", port=port, debug=debug)
