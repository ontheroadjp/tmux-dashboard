from types import SimpleNamespace

from tmux_dashboard.app import create_app
from tmux_dashboard.config import load_config
from tmux_dashboard.routes import _resolve_client_ip


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


def test_auth_login_rate_limit(monkeypatch):
    monkeypatch.setenv("DASHBOARD_LOGIN_ATTEMPT_LIMIT", "2")
    monkeypatch.setenv("DASHBOARD_LOGIN_WINDOW_SEC", "600")
    monkeypatch.setenv("DASHBOARD_LOGIN_LOCK_SEC", "900")
    app = create_app()
    client = app.test_client()

    resp1 = client.post("/api/auth/login", json={"user": "x", "password": "y"})
    assert resp1.status_code == 401

    resp2 = client.post("/api/auth/login", json={"user": "x", "password": "y"})
    assert resp2.status_code == 401

    resp3 = client.post("/api/auth/login", json={"user": "x", "password": "y"})
    assert resp3.status_code == 429
    assert resp3.get_json()["ok"] is False


def test_auth_login_rate_limit_uses_forwarded_ip_for_loopback_proxy(monkeypatch):
    monkeypatch.setenv("DASHBOARD_LOGIN_ATTEMPT_LIMIT", "1")
    monkeypatch.setenv("DASHBOARD_LOGIN_WINDOW_SEC", "600")
    monkeypatch.setenv("DASHBOARD_LOGIN_LOCK_SEC", "900")
    app = create_app()
    client = app.test_client()

    resp1 = client.post(
        "/api/auth/login",
        json={"user": "x", "password": "y"},
        headers={"X-Forwarded-For": "198.51.100.10"},
    )
    assert resp1.status_code == 401

    # Different forwarded client IP should not hit the lockout bucket.
    resp2 = client.post(
        "/api/auth/login",
        json={"user": "x", "password": "y"},
        headers={"X-Forwarded-For": "198.51.100.11"},
    )
    assert resp2.status_code == 401


def test_auth_login_rate_limit_ignores_forwarded_ip_when_not_loopback(monkeypatch):
    monkeypatch.setenv("DASHBOARD_LOGIN_ATTEMPT_LIMIT", "1")
    monkeypatch.setenv("DASHBOARD_LOGIN_WINDOW_SEC", "600")
    monkeypatch.setenv("DASHBOARD_LOGIN_LOCK_SEC", "900")
    app = create_app()
    client = app.test_client()

    resp1 = client.post(
        "/api/auth/login",
        json={"user": "x", "password": "y"},
        headers={"X-Forwarded-For": "198.51.100.20"},
        environ_overrides={"REMOTE_ADDR": "203.0.113.40"},
    )
    assert resp1.status_code == 401

    # For non-loopback remote addresses, lockout is keyed by remote_addr.
    resp2 = client.post(
        "/api/auth/login",
        json={"user": "x", "password": "y"},
        headers={"X-Forwarded-For": "198.51.100.21"},
        environ_overrides={"REMOTE_ADDR": "203.0.113.40"},
    )
    assert resp2.status_code == 429
    assert resp2.get_json()["ok"] is False


def _login_and_get_token(client, user: str = "test-user", password: str = "test-password") -> str:
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


def test_action_failure_response_is_sanitized(monkeypatch):
    monkeypatch.setattr(
        "tmux_dashboard.app.execute_action",
        lambda action, payload: {
            "ok": False,
            "stdout": "internal-stdout",
            "stderr": "/srv/app/private/path",
            "returncode": 1,
            "code": "TMUX_ACTION_FAILED",
        },
    )
    app = create_app()
    client = app.test_client()
    token = _login_and_get_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post("/api/actions/send_keys", json={"target_pane": "%1", "keys": ["Enter"]}, headers=headers)
    assert resp.status_code == 400
    payload = resp.get_json()
    assert payload["ok"] is False
    assert payload["error"] == "action failed"
    assert payload["code"] == "TMUX_ACTION_FAILED"
    assert "stderr" not in payload
    assert "stdout" not in payload


def test_pane_detail_requires_auth():
    app = create_app()
    client = app.test_client()

    resp = client.get("/api/panes/%251")
    assert resp.status_code == 401
    assert resp.get_json()["ok"] is False


def test_pane_detail_returns_404_when_not_found(monkeypatch):
    monkeypatch.setattr("tmux_dashboard.app.collect_pane_detail", lambda pane_id: None)
    app = create_app()
    client = app.test_client()
    token = _login_and_get_token(client)

    resp = client.get("/api/panes/%251", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 404
    assert resp.get_json()["ok"] is False


def test_pane_detail_returns_detail(monkeypatch):
    monkeypatch.setattr(
        "tmux_dashboard.app.collect_pane_detail",
        lambda pane_id: {
            "session": {"name": "s0", "attached": True},
            "window": {"id": "@1", "index": 0, "name": "w0", "active": True},
            "pane": {
                "id": pane_id,
                "index": 1,
                "active": True,
                "pid": "123",
                "current_command": "zsh",
                "current_path": "/tmp",
                "title": "pane-title",
                "process": {"command": "zsh"},
            },
            "output": "line1\nline2\n",
        },
    )
    app = create_app()
    client = app.test_client()
    token = _login_and_get_token(client)

    resp = client.get("/api/panes/%251", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    payload = resp.get_json()
    assert payload["ok"] is True
    assert payload["pane"]["id"] == "%1"
    assert "line1" in payload["output"]


def test_auth_secret_is_auto_generated_when_missing(monkeypatch):
    monkeypatch.delenv("DASHBOARD_AUTH_SECRET", raising=False)
    cfg = load_config()
    assert isinstance(cfg.auth_secret, str)
    assert len(cfg.auth_secret) >= 32


def test_old_token_is_invalid_after_restart_like_reinit_when_secret_is_auto_generated(monkeypatch):
    monkeypatch.setenv("DASHBOARD_AUTH_USER", "admin")
    monkeypatch.setenv("DASHBOARD_AUTH_PASSWORD", "hogehoge")
    monkeypatch.delenv("DASHBOARD_AUTH_SECRET", raising=False)

    app1 = create_app()
    client1 = app1.test_client()
    token = _login_and_get_token(client1, "admin", "hogehoge")

    # Simulate restart-like reinitialization: no fixed secret => new secret.
    app2 = create_app()
    client2 = app2.test_client()
    resp = client2.get("/api/auth/session", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert resp.get_json()["authenticated"] is False


def test_old_token_remains_valid_after_restart_like_reinit_when_secret_is_fixed(monkeypatch):
    monkeypatch.setenv("DASHBOARD_AUTH_USER", "admin")
    monkeypatch.setenv("DASHBOARD_AUTH_PASSWORD", "hogehoge")
    monkeypatch.setenv("DASHBOARD_AUTH_SECRET", "fixed-secret-for-tests")

    app1 = create_app()
    client1 = app1.test_client()
    token = _login_and_get_token(client1, "admin", "hogehoge")

    # Simulate restart-like reinitialization: fixed secret => token remains valid.
    app2 = create_app()
    client2 = app2.test_client()
    resp = client2.get("/api/auth/session", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.get_json()["authenticated"] is True


def test_prod_requires_auth_secret(monkeypatch):
    monkeypatch.setenv("DASHBOARD_ENV", "prod")
    monkeypatch.setenv("DASHBOARD_AUTH_USER", "admin")
    monkeypatch.setenv("DASHBOARD_AUTH_PASSWORD", "hogehoge")
    monkeypatch.setenv("DASHBOARD_ENV_FILE", "/tmp/tmux_dashboard_nonexistent.env")
    monkeypatch.delenv("DASHBOARD_AUTH_SECRET", raising=False)

    try:
        load_config()
        assert False, "load_config should raise ValueError in production when auth secret is missing"
    except ValueError as e:
        assert "DASHBOARD_AUTH_SECRET" in str(e)


def test_resolve_client_ip_prefers_forwarded_for_on_loopback():
    req = SimpleNamespace(
        remote_addr="127.0.0.1",
        headers={"X-Forwarded-For": "198.51.100.10, 127.0.0.1", "X-Real-IP": "198.51.100.20"},
    )
    assert _resolve_client_ip(req) == "198.51.100.10"


def test_resolve_client_ip_falls_back_to_real_ip_on_loopback():
    req = SimpleNamespace(
        remote_addr="::1",
        headers={"X-Forwarded-For": "", "X-Real-IP": "198.51.100.30"},
    )
    assert _resolve_client_ip(req) == "198.51.100.30"


def test_resolve_client_ip_ignores_forwarded_headers_for_non_loopback():
    req = SimpleNamespace(
        remote_addr="203.0.113.9",
        headers={"X-Forwarded-For": "198.51.100.40", "X-Real-IP": "198.51.100.41"},
    )
    assert _resolve_client_ip(req) == "203.0.113.9"
