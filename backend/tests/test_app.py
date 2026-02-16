from tmux_dashboard.app import create_app


def test_health_endpoint():
    app = create_app()
    client = app.test_client()

    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.get_json() == {"ok": True}


def test_disabled_action_returns_403(monkeypatch):
    monkeypatch.setenv("DASHBOARD_ALLOWED_ACTIONS", "select_pane")
    app = create_app()
    client = app.test_client()

    resp = client.post("/api/actions/kill_session", json={"target_session": "x"})
    assert resp.status_code == 403
    assert resp.get_json()["ok"] is False
