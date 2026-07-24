#!/bin/sh
# Drop privileges to a non-root user at runtime while still being able to fix
# /data ownership first — the LinuxServer-style PUID/PGID pattern.
#
# Why this exists: the image runs the app as a non-root user. On a *fresh*
# install an empty named volume inherits the right ownership, but on an *upgrade*
# (or any bind-mount) /data already holds root-owned files from the old root
# image, which a non-root process can't write — every write, including the
# startup schema migration, would fail. So we start as root, chown /data to the
# requested uid/gid, then exec the app as that user via gosu.
#
# PUID/PGID let bind-mount users match their host account (default 10001).
set -e

PUID="${PUID:-10001}"
PGID="${PGID:-10001}"

# Reverse-proxy support: when TRUST_PROXY is set, tell uvicorn to honor
# X-Forwarded-* from the given proxy IPs (real client IP + scheme). Behind a
# single trusted proxy, FORWARDED_ALLOW_IPS="*" is the common setting; scope it
# to the proxy's IP for stricter setups.
if [ -n "${TRUST_PROXY:-}" ]; then
    set -- "$@" --proxy-headers --forwarded-allow-ips "${FORWARDED_ALLOW_IPS:-*}"
fi

if [ "$(id -u)" = "0" ]; then
    mkdir -p /data
    # Only chown when it's actually needed — skips a slow recursive pass on large
    # volumes that are already owned correctly.
    if [ "$(stat -c '%u:%g' /data)" != "${PUID}:${PGID}" ]; then
        echo "[entrypoint] setting /data ownership to ${PUID}:${PGID}"
        chown -R "${PUID}:${PGID}" /data
    fi
    exec gosu "${PUID}:${PGID}" "$@"
fi

# Already non-root (USER overridden, or a read-only/rootless runtime): just run.
exec "$@"
