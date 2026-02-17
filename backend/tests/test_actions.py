from tmux_dashboard.actions import execute_action


def test_send_keys_literal_mode_routes_to_explicit_l_flag(monkeypatch):
    captured = {}

    def fake_run_tmux(args):
        captured["args"] = args
        return {"ok": True}

    monkeypatch.setattr("tmux_dashboard.actions._run_tmux", fake_run_tmux)

    result = execute_action("send_keys", {"target_pane": "%1", "keys": ["-l", "echo hello"]})

    assert result["ok"] is True
    assert captured["args"] == ["send-keys", "-l", "-t", "%1", "echo hello"]


def test_send_keys_requires_target_pane():
    result = execute_action("send_keys", {"keys": ["-l", "abc"]})
    assert result["ok"] is False
    assert result["error"] == "target_pane is required"
