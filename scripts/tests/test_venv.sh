# Run with bash.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
python3 - "$REPO_ROOT" <<'PY'
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

source = Path(sys.argv[1])
with tempfile.TemporaryDirectory(prefix="tmux-dashboard-venv-test-") as directory:
    root = Path(directory)
    for path in ("scripts", "backend/venv/bin", "frontend/node_modules/.bin", "tunnel", "launchd"):
        (root / path).mkdir(parents=True, exist_ok=True)
    for name in ("bootstrap.sh", "doctor.sh"):
        shutil.copy2(source / "scripts" / name, root / "scripts" / name)
    for path in ("backend/.env.dev.example", "backend/.env.prod.example", "frontend/.env.dev.example", "frontend/.env.prod.example", "tunnel/.env.dev.example", "tunnel/.env.prod.example"):
        (root / path).touch()
    for path in ("backend/venv/bin/pip", "frontend/node_modules/.bin/next", "launchd/render-prod-files.sh"):
        executable = root / path
        executable.write_text(f"#!{shutil.which('sh')}\nexit 0\n")
        executable.chmod(0o755)
    python = root / "backend/venv/bin/python"
    python.write_text(f"#!{shutil.which('sh')}\n" + "case \"$2\" in *sys.version_info*) echo \"$TEST_PYTHON_VERSION\";; *) exit \"$TEST_IMPORT_STATUS\";; esac\n")
    python.chmod(0o755)
    (root / "backend/venv/bin/gunicorn").touch(mode=0o755)
    (root / "backend/venv/pyvenv.cfg").write_text("version = 3.12.3\n")
    env = dict(os.environ, TEST_PYTHON_VERSION="3.12", TEST_IMPORT_STATUS="0")

    def run(name, **changes):
        result = subprocess.run(["bash", str(root / "scripts" / name)], env=dict(env, **changes), text=True, capture_output=True)
        return result.returncode, result.stdout + result.stderr

    _, output = run("doctor.sh")
    assert "backend venv Python version matches: 3.12" in output
    assert "backend dependencies import: gunicorn, flask" in output
    status, output = run("bootstrap.sh")
    assert status == 0, output
    status, output = run("bootstrap.sh", TEST_PYTHON_VERSION="3.14")
    assert status != 0 and "created with Python 3.12 but runs Python 3.14" in output
    _, output = run("doctor.sh", TEST_PYTHON_VERSION="3.14")
    assert "backend venv Python version mismatch" in output
    _, output = run("doctor.sh", TEST_IMPORT_STATUS="1")
    assert "backend dependencies cannot be imported" in output
print("venv diagnostics: ok")
PY
