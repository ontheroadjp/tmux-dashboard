from tmux_dashboard.collectors import _mask_sensitive_text, collect_pane_detail


def test_mask_sensitive_text_redacts_secret_like_values():
    text = "python app.py password=abc token=xyz api_key=qwe"
    masked = _mask_sensitive_text(text)
    assert "password=abc" not in masked
    assert "token=xyz" not in masked
    assert "api_key=qwe" not in masked
    assert "password=[REDACTED]" in masked
    assert "token=[REDACTED]" in masked
    assert "api_key=[REDACTED]" in masked


def test_mask_sensitive_text_redacts_bearer_token():
    text = "Authorization: Bearer this-is-secret"
    masked = _mask_sensitive_text(text)
    assert "this-is-secret" not in masked
    assert "Bearer [REDACTED]" in masked


def test_collect_pane_detail_returns_detail_from_single_pane_query(monkeypatch):
    pane_id = "%42"
    monkeypatch.setattr(
        "tmux_dashboard.collectors.collect_tmux_state",
        lambda: {
            "available": True,
            "running": True,
            "sessions": [
                {
                    "name": "session-a",
                    "attached": True,
                    "windows": [
                        {
                            "id": "@9",
                            "index": 3,
                            "name": "window-3",
                            "active": True,
                            "panes": [
                                {
                                    "id": pane_id,
                                    "index": 1,
                                    "active": True,
                                    "pid": "1234",
                                    "current_command": "zsh",
                                    "current_path": "/tmp",
                                    "title": "title-a",
                                    "process": {"command": "zsh"},
                                }
                            ],
                        }
                    ],
                }
            ],
            "error": "",
        },
    )
    monkeypatch.setattr("tmux_dashboard.collectors._capture_pane_output", lambda *_args, **_kwargs: "hello\n")

    detail = collect_pane_detail(pane_id)
    assert detail is not None
    assert detail["session"]["name"] == "session-a"
    assert detail["session"]["attached"] is True
    assert detail["window"]["id"] == "@9"
    assert detail["window"]["index"] == 3
    assert detail["pane"]["id"] == pane_id
    assert detail["pane"]["process"]["command"] == "zsh"
    assert detail["output"] == "hello\n"


def test_collect_pane_detail_returns_none_when_tmux_has_no_target(monkeypatch):
    monkeypatch.setattr("tmux_dashboard.collectors._run_command", lambda _args: "")
    monkeypatch.setattr("tmux_dashboard.collectors._capture_pane_output", lambda *_args, **_kwargs: "ignored")

    assert collect_pane_detail("%404") is None
