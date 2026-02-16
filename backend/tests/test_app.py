from tmux_dashboard.app import create_app


def test_health_endpoint():
    app = create_app()
    client = app.test_client()

    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.get_json() == {"ok": True}


def test_snapshot_requires_auth():
    app = create_app()
    client = app.test_client()

    resp = client.get("/api/snapshot")
    assert resp.status_code == 401
    assert resp.get_json()["ok"] is False


def test_auth_login_invalid_credentials():
    app = create_app()
    client = app.test_client()

    resp = client.post("/api/auth/login", json={"user": "x", "password": "y"})
    assert resp.status_code == 401
    assert resp.get_json()["ok"] is False


def _login_and_get_token(client, user: str = "admin", password: str = "admin") -> str:
    resp = client.post("/api/auth/login", json={"user": user, "password": password})
    assert resp.status_code == 200
    json = resp.get_json()
    assert json["ok"] is True
    assert json["token"]
    return str(json["token"])


def test_auth_session_and_snapshot_with_token(monkeypatch):
    monkeypatch.setenv("DASHBOARD_AUTH_USER", "tester")
    monkeypatch.setenv("DASHBOARD_AUTH_PASSWORD", "pass123")
    monkeypatch.setattr(
        "tmux_dashboard.app.collect_tmux_state",
        lambda: {"available": True, "running": True, "error": "", "sessions": []},
    )
    monkeypatch.setattr(
        "tmux_dashboard.app.collect_network_state",
        lambda: {"listening_servers": [], "ssh_connections": [], "ssh_tunnels": []},
    )

    app = create_app()
    client = app.test_client()
    token = _login_and_get_token(client, "tester", "pass123")
    headers = {"Authorization": f"Bearer {token}"}

    session_resp = client.get("/api/auth/session", headers=headers)
    assert session_resp.status_code == 200
    assert session_resp.get_json()["authenticated"] is True
    assert session_resp.get_json()["user"] == "tester"

    snapshot_resp = client.get("/api/snapshot", headers=headers)
    assert snapshot_resp.status_code == 200
    assert snapshot_resp.get_json()["tmux"]["available"] is True


def test_disabled_action_returns_403(monkeypatch):
    monkeypatch.setenv("DASHBOARD_ALLOWED_ACTIONS", "select_pane")
    app = create_app()
    client = app.test_client()
    token = _login_and_get_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post("/api/actions/kill_session", json={"target_session": "x"}, headers=headers)
    assert resp.status_code == 403
    assert resp.get_json()["ok"] is False
