"""Guard: the Dockerfile installs runtime deps from a hardcoded pip list (it
cannot `pip install ./backend` because pyproject references ../LICENSE outside
the build context). That list must stay in sync with [project].dependencies, or
the image starts missing a package and the app crashes on boot (this is exactly
how phonenumbers slipped out of v0.10.0). This test fails if any runtime dep is
absent from the Dockerfile.
"""

import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def _base_names(specs: list[str]) -> set[str]:
    # "uvicorn[standard]>=0.30" -> "uvicorn"; "fastapi>=0.115" -> "fastapi"
    return {re.split(r"[><=!~\[ ]", s.strip(), maxsplit=1)[0].lower() for s in specs}


def test_dockerfile_installs_all_runtime_deps():
    pyproject = tomllib.loads((ROOT / "backend" / "pyproject.toml").read_text(encoding="utf-8"))
    deps = _base_names(pyproject["project"]["dependencies"])
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8").lower()
    missing = sorted(d for d in deps if f'"{d}' not in dockerfile)
    assert not missing, f"Dockerfile pip list is missing runtime deps: {missing}"


def test_dockerfile_drops_privileges_with_healthcheck():
    # The app must not run as root. We start as root only to fix /data ownership,
    # then drop to PUID/PGID via gosu in the entrypoint (so upgrades of an
    # existing root-owned volume keep working). Guard that wiring stays intact.
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    assert "gosu" in dockerfile
    assert "docker-entrypoint.sh" in dockerfile
    assert "HEALTHCHECK" in dockerfile


def test_entrypoint_chowns_data_and_steps_down():
    entrypoint = (ROOT / "docker-entrypoint.sh").read_text(encoding="utf-8")
    assert "PUID" in entrypoint and "PGID" in entrypoint
    assert "chown" in entrypoint
    assert "exec gosu" in entrypoint  # privilege step-down, then run the app


def test_compose_has_no_empty_environment_key():
    # A bare `environment:` with only comments under it parses as null and makes
    # `docker compose config` fail — the documented deploy path must stay valid.
    # A populated `environment:` (a service with real entries under it) is fine,
    # so flag a header only when it has no more-indented child line.
    lines = (ROOT / "docker-compose.yml").read_text(encoding="utf-8").splitlines()
    for i, line in enumerate(lines):
        m = re.match(r"^(\s*)environment:\s*$", line)
        if not m:
            continue
        indent = len(m.group(1))
        j = i + 1
        while j < len(lines) and (not lines[j].strip() or lines[j].lstrip().startswith("#")):
            j += 1  # skip blank/comment lines to the first real line
        has_child = j < len(lines) and (len(lines[j]) - len(lines[j].lstrip())) > indent
        assert has_child, f"empty environment: block at docker-compose.yml line {i + 1}"
