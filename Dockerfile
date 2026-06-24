# ── Stage 1: build the Vite SPA ──────────────────────────────────────────────
FROM node:20-alpine AS frontend

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
    "httpx>=0.27"

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

EXPOSE 7676

WORKDIR /app/backend

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7676"]
