"""Guards for the container build and its dependency lock chain.

The image cannot `pip install ./backend` (pyproject references ../LICENSE,
outside the build context, which breaks pip's build isolation), so runtime deps
are installed from a committed, hash-pinned export instead. That gives three
files that must agree, and a package silently dropping out of the chain means
the image crashes on boot — exactly how phonenumbers slipped out of v0.10.0:

    backend/pyproject.toml   declared ranges (source of truth)
      -> backend/uv.lock     full resolution (`uv lock`)
        -> backend/requirements.lock       runtime + postgres, for the Dockerfile
        -> backend/requirements-dev.lock   ...plus dev, for CI

These tests check each hop without needing uv installed.
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


def _locked_names(lock: Path) -> set[str]:
    """Package names pinned in an exported requirements file."""
    text = lock.read_text(encoding="utf-8")
    return {_canon(m) for m in re.findall(r"^([A-Za-z0-9._-]+)==", text, re.MULTILINE)}


def test_dockerfile_installs_from_the_hash_pinned_lock():
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    assert "requirements.lock" in dockerfile, "Dockerfile must install from the lock file"
    assert "--require-hashes" in dockerfile, (
        "drop --require-hashes and the build silently accepts unverified wheels"
    )


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
        "run `uv lock --project backend` and re-export the requirements locks"
    )


def _runtime_closure() -> set[str]:
    """Every package reachable from the root's runtime deps + the `postgres`
    extra, walked through uv.lock's dependency graph. This is what the image
    must contain — no more (pytest has no place in a shipped image) and no less
    (a missing transitive crashes the app on boot)."""
    lock = tomllib.loads((BACKEND / "uv.lock").read_text(encoding="utf-8"))
    packages = {_canon(p["name"]): p for p in lock["package"]}
    root = packages["minimalpoi-backend"]

    seen: set[str] = set()

    def visit(entries: list[dict]) -> None:
        for entry in entries:
            name = _canon(entry["name"])
            pkg = packages[name]
            # An extra (e.g. uvicorn[standard]) pulls in that package's own
            # optional group, so recurse through it as well.
            groups = [pkg.get("optional-dependencies", {}).get(e, []) for e in entry.get("extra", [])]
            if name in seen:
                for group in groups:
                    visit(group)
                continue
            seen.add(name)
            visit(pkg.get("dependencies", []))
            for group in groups:
                visit(group)

    visit(root["dependencies"] + root.get("optional-dependencies", {}).get("postgres", []))
    return seen


def test_requirements_lock_matches_the_runtime_closure():
    locked = _locked_names(BACKEND / "requirements.lock")
    closure = _runtime_closure()
    assert not (closure - locked), (
        f"backend/requirements.lock is missing runtime deps: {sorted(closure - locked)}"
    )
    # `psycopg[binary]` resolves to a psycopg-binary distribution that uv.lock
    # models as an extra rather than a graph node, so allow that one addition.
    extra = locked - closure - {"psycopg-binary"}
    assert not extra, f"packages in the runtime image that nothing depends on: {sorted(extra)}"


def test_requirements_dev_lock_is_a_superset_with_dev_extras():
    project = _pyproject()["project"]
    runtime = _locked_names(BACKEND / "requirements.lock")
    dev = _locked_names(BACKEND / "requirements-dev.lock")
    assert not (runtime - dev), (
        "backend/requirements-dev.lock must contain everything the runtime lock does, "
        f"so CI tests the shipped versions; missing: {sorted(runtime - dev)}"
    )
    required = {_parse_req(s)[0] for s in project["optional-dependencies"]["dev"]}
    assert not (required - dev), (
        f"backend/requirements-dev.lock is missing dev deps: {sorted(required - dev)}"
    )


def test_exported_locks_pin_every_package_with_hashes():
    # `pip install --require-hashes` is all-or-nothing: one unhashed line and the
    # install aborts. Catch that here rather than in a failed release build.
    for name in ("requirements.lock", "requirements-dev.lock"):
        lines = (BACKEND / name).read_text(encoding="utf-8").splitlines()
        for i, line in enumerate(lines):
            if not re.match(r"^[A-Za-z0-9._-]+==", line):
                continue
            block = "\n".join(lines[i : i + 2])
            assert "--hash=sha256:" in block, f"{name} line {i + 1} is pinned but unhashed: {line}"


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
