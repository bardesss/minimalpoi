"""Guards for the container build and its dependency lock.

The image cannot `pip install ./backend` (pyproject references ../LICENSE,
outside the build context, which breaks pip's build isolation), so runtime deps
are installed from a hash-pinned pin list that the Dockerfile's `deps` stage
generates with `uv export`. That export is a pure function of pyproject.toml +
uv.lock, so it is built rather than committed and uv.lock stays the single
source of truth — there is no second file to drift out of date.

That leaves one hop worth guarding, pyproject.toml -> uv.lock, plus the shape
of the Dockerfile wiring. A dep silently dropping out means the image crashes
on boot, which is exactly how phonenumbers slipped out of v0.10.0.

Neither test needs uv installed.
"""

import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"

# "uvicorn[standard]>=0.30 ; python_version >= '3.12'"
#   -> name "uvicorn", extras ("standard",), specifier ">=0.30"
_REQ = re.compile(r"^(?P<name>[A-Za-z0-9._-]+)\s*(?:\[(?P<extras>[^\]]*)\])?\s*(?P<spec>[^;]*)")


def _canon(name: str) -> str:
    # PEP 503 normalization, so "PyJWT" / "python_multipart" compare equal to
    # the names uv writes into the lock files.
    return re.sub(r"[-_.]+", "-", name).lower()


def _parse_req(spec: str) -> tuple[str, tuple[str, ...], str]:
    m = _REQ.match(spec.strip())
    assert m, f"unparseable requirement: {spec!r}"
    extras = tuple(sorted(_canon(e) for e in (m["extras"] or "").split(",") if e.strip()))
    return _canon(m["name"]), extras, m["spec"].strip()


def _pyproject() -> dict:
    return tomllib.loads((BACKEND / "pyproject.toml").read_text(encoding="utf-8"))


def _declared() -> set[tuple[str | None, str, tuple[str, ...], str]]:
    """Every declared requirement as (extra_group_or_None, name, extras, specifier)."""
    project = _pyproject()["project"]
    declared = {(None, *_parse_req(s)) for s in project["dependencies"]}
    for group, specs in project.get("optional-dependencies", {}).items():
        declared |= {(_canon(group), *_parse_req(s)) for s in specs}
    return declared


def _dockerfile() -> str:
    return (ROOT / "Dockerfile").read_text(encoding="utf-8")


def test_dockerfile_exports_runtime_deps_only():
    dockerfile = _dockerfile()
    # Match the instruction, not the comment above it explaining what it does.
    export = next(
        (ln for ln in dockerfile.splitlines() if ln.startswith("RUN") and "uv export" in ln), None
    )
    assert export, "the deps stage must generate its pin list with `uv export`"
    # --frozen is what makes the export a read of the committed resolution
    # rather than a fresh one: without it a stale uv.lock would be silently
    # re-resolved at build time and the image would stop being reproducible.
    assert "--frozen" in export, "`uv export` must be --frozen or the build re-resolves"
    # The image bakes in the `postgres` extra unconditionally. It must not bake
    # in `dev` — pytest has no place in a shipped image.
    assert "--extra postgres" in export
    assert "--extra dev" not in export, "dev tooling must not ship in the runtime image"


def test_dockerfile_installs_with_hash_checking():
    dockerfile = _dockerfile()
    assert "--require-hashes" in dockerfile, (
        "drop --require-hashes and the build silently accepts unverified wheels"
    )
    assert "COPY --from=deps" in dockerfile, "runtime stage must take the pin list from `deps`"


def test_dockerfile_pins_the_uv_version():
    # An unpinned uv could change export behaviour (or its own supply chain)
    # between builds of the same commit — the exact thing the lock exists to stop.
    m = re.search(r"COPY --from=ghcr\.io/astral-sh/uv:(\S+)", _dockerfile())
    assert m, "the deps stage must copy uv from a pinned ghcr.io/astral-sh/uv image"
    assert re.fullmatch(r"\d+\.\d+\.\d+", m[1]), f"uv image tag is not an exact version: {m[1]}"


def test_uv_lock_matches_declared_dependencies():
    """`uv.lock` is stale unless its record of our own requirements still matches
    pyproject — the same drift `uv lock --check` catches, minus the uv dependency."""
    lock = tomllib.loads((BACKEND / "uv.lock").read_text(encoding="utf-8"))
    root = next(p for p in lock["package"] if _canon(p["name"]) == "minimalpoi-backend")
    recorded = set()
    for req in root["metadata"]["requires-dist"]:
        group = re.search(r"extra == '([^']+)'", req.get("marker", ""))
        recorded.add((
            _canon(group[1]) if group else None,
            _canon(req["name"]),
            tuple(sorted(_canon(e) for e in req.get("extras", []))),
            req.get("specifier", ""),
        ))
    assert recorded == _declared(), (
        "backend/uv.lock is out of date with backend/pyproject.toml — "
        "run `uv lock --project backend`"
    )


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
