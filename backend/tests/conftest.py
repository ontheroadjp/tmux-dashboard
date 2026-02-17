import sys
from pathlib import Path
import os

import pytest


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("DASHBOARD_AUTH_USER", "test-user")
os.environ.setdefault("DASHBOARD_AUTH_PASSWORD", "test-password")


@pytest.fixture(autouse=True)
def _auth_env_defaults(monkeypatch):
    monkeypatch.setenv("DASHBOARD_AUTH_USER", "test-user")
    monkeypatch.setenv("DASHBOARD_AUTH_PASSWORD", "test-password")
