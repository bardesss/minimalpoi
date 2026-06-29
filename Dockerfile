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

# Install runtime dependencies explicitly.
# Keep this list in sync with [project].dependencies in backend/pyproject.toml.
# (We do NOT use `pip install ./backend` because pyproject.toml references
#  ../LICENSE outside the build context, which breaks pip's build isolation.)
RUN pip install --no-cache-dir \
    "fastapi>=0.115" \
    "uvicorn[standard]>=0.30" \
    "sqlmodel>=0.0.22" \
    "pyjwt>=2.9" \
    "bcrypt>=4.2" \
    "cryptography>=43" \
    "python-multipart>=0.0.9" \
    "httpx>=0.27" \
    "pillow>=11" \
    "phonenumbers>=8.13" \
    "slowapi>=0.1.9"

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

# Run as a non-root user. A named volume inherits /data's ownership on first
# mount, so fresh installs work out of the box. NOTE: upgrading an existing
# deployment whose volume is root-owned needs a one-time
# `chown -R 10001:10001` of the volume (see README).
RUN useradd --system --uid 10001 --create-home appuser \
    && chown -R appuser:appuser /data /app
USER appuser

EXPOSE 7676

WORKDIR /app/backend

# Liveness via the existing health endpoint (no curl in the slim image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:7676/api/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7676"]
