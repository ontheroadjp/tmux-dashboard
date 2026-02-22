from tmux_dashboard.collectors import _mask_sensitive_text


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
