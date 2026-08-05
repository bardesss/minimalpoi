# ── Stage 1: build the Vite SPA ──────────────────────────────────────────────
# Pin this stage to the native build platform ($BUILDPLATFORM, e.g. amd64 on
# the CI runner) so the Node/Vite build never runs under QEMU emulation when
# targeting linux/arm64. The output is static JS/HTML/CSS — architecture-
# independent — so building it once natively and copying into each arch's
# runtime image is safe, and it keeps the multi-arch build from hanging for
# hours on the emulated `npm run build`.
FROM --platform=$BUILDPLATFORM node:20-alpine AS frontend

WORKDIR /app/frontend

# Install dependencies first (layer-cached unless lock file changes)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy the rest of the frontend source and build
COPY frontend/ ./
RUN npm run build
# Produces /app/frontend/dist

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

ARG VERSION=dev
ENV MINIMALPOI_VERSION=$VERSION

# gosu lets the entrypoint drop from root to the runtime user after fixing
# /data ownership (privilege step-down, not step-up).
RUN apt-get update \
    && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/* \
    && gosu nobody true

# Install runtime dependencies from the committed lock file: every package is
# pinned to an exact version and verified against its hashes, so an image built
# today and one built in six months from the same commit are identical.
# Regenerate it (plus the dev variant) from the repo root after touching
# [project].dependencies — see the header comment inside requirements.lock.
# (We do NOT use `pip install ./backend` because pyproject.toml references
#  ../LICENSE outside the build context, which breaks pip's build isolation.)
# Copied on its own, before the source, so this layer stays cached across
# source-only changes.
COPY backend/requirements.lock /tmp/requirements.lock
RUN pip install --no-cache-dir --require-hashes -r /tmp/requirements.lock \
    && rm /tmp/requirements.lock

# Copy backend source
COPY backend/ /app/backend/

# Copy the built SPA from the frontend stage
# spa_dist_dir() = Path(__file__).resolve().parents[2] / "frontend" / "dist"
# With main.py at /app/backend/app/main.py, parents[2] = /app
# so the dist must be at /app/frontend/dist
COPY --from=frontend /app/frontend/dist /app/frontend/dist

# Data directory for SQLite DB, secret.key, and uploaded images
ENV MINIMALPOI_DATA_DIR=/data
RUN mkdir -p /data

# The container starts as root only long enough for the entrypoint to chown
# /data, then drops to a non-root user (PUID/PGID, default 10001) via gosu — so
# the app process never runs as root, yet upgrades of an existing root-owned
# volume keep working with no manual chown. See docker-entrypoint.sh.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 7676

WORKDIR /app/backend

# Liveness via the existing health endpoint (no curl in the slim image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:7676/api/health')" || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7676"]
