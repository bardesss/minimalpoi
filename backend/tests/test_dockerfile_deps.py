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


def test_dockerfile_runs_nonroot_with_healthcheck():
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    assert "USER appuser" in dockerfile
    assert "HEALTHCHECK" in dockerfile


def test_compose_has_no_empty_environment_key():
    # A bare `environment:` with only comments under it parses as null and makes
    # `docker compose config` fail — the documented deploy path must stay valid.
    compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    assert not re.search(r"(?m)^\s*environment:\s*$", compose)
