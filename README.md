# 📍 MinimalPOI

**A self-hosted, multi-user map for collecting, enriching, and organizing your points of interest.**

Drop a pin, paste a link to auto-fill the details, and keep all your favorite places — restaurants, trails, shops, anything — on one shared, searchable map that you fully own.

![License](https://img.shields.io/badge/license-MIT-blue) ![Container](https://img.shields.io/badge/image-ghcr.io-2496ED?logo=docker&logoColor=white) ![Backend](https://img.shields.io/badge/FastAPI-Python%203.12-009688?logo=fastapi&logoColor=white) ![Frontend](https://img.shields.io/badge/React%20%2B%20Vite-MapLibre-61DAFB?logo=react&logoColor=black)

---

## ✨ Features

- 🗺️ **Interactive map** — a MapLibre map with category-colored pins. Search and filter by text or category, click a pin or list card to open its details, and click anywhere on the map to drop a new place. Duplicate detection warns you before you save the same spot twice.
- 🔗 **Enrich from a link** — paste a Google Maps or website URL and MinimalPOI auto-fills the name, coordinates, address, phone, image, and description (OpenGraph + JSON-LD + Twitter Card, with an optional Google Places key and a Nominatim geocoding fallback). Every auto-filled field shows where it came from.
- 💾 **Import & export** — bulk-import places from **GeoJSON or CSV** (with server-side duplicate detection and automatic category matching), and export your whole collection as a **GeoJSON backup** — all from the in-app **Data & backups** panel.
- 🏷️ **Categories & organization** — a shared place list with full create/edit/delete, categories with custom color and icon, and tags.
- 👥 **Multi-user** — first-run admin setup, secure cookie login, admin/member roles, and teams. Each user gets **visited** marks (with a 1–5 rating), a **wishlist**, and attributed **comments**.
- 🖼️ **Local images** — enriched images are downloaded and served from your own server; manual upload is supported too.
- 🔁 **Optional TRIP sync** — connect a [TRIP](https://github.com/itskovacs/trip) instance and MinimalPOI keeps categories and places reconciled **both ways** (creates, edits, and deletes propagate, with a configurable conflict policy). Entirely optional — enable it only if you use TRIP.
- 🐳 **Self-hosted & simple** — ships as a single multi-arch Docker image (amd64 + arm64), stores everything in SQLite on one volume, and needs **no external services** to run.

---

## 🚀 Deploy

MinimalPOI runs as one container on **port 7676**. All state (database, images, signing key) lives in a single `/data` volume.

### Option A — Docker (recommended)

```bash
docker run -d \
  --name minimalpoi \
  -p 7676:7676 \
  -v minimalpoi-data:/data \
  --restart unless-stopped \
  ghcr.io/bardesss/minimalpoi:latest
```

### Option B — docker compose

```bash
docker compose up -d
```

Then open **http://localhost:7676** and create your admin account on the first-run setup screen. 🎉

> 💡 **Pin a version** instead of `latest` for reproducible deploys, e.g. `ghcr.io/bardesss/minimalpoi:0.1`.

> ⚠️ **No published image yet?** Until the first release is cut and its GHCR package is made public, build from source instead: in `docker-compose.yml` comment the `image:` line and uncomment `build: .`, then run `docker compose up -d --build`.

### ⚙️ Configuration

**No environment variables are required.** Everything persists in the `/data` volume (`minimalpoi.db`, uploaded images, and an auto-generated `secret.key`). Set `SECRET_KEY` yourself only if you'd rather manage the signing key.

---

## 🔄 Releases

Versioning and image publishing are automated:

1. Changes land on `main` using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, …).
2. [release-please](https://github.com/googleapis/release-please) maintains a **release PR** that bumps the version and updates [`CHANGELOG.md`](CHANGELOG.md).
3. Merging that PR tags the release and publishes a multi-arch image to `ghcr.io/bardesss/minimalpoi` (tags `X.Y.Z`, `X.Y`, `X`, and `latest`).

> 🔓 **One-time:** after the first release, set the GHCR package to **public** (GitHub → Packages → minimalpoi → Package settings) so the image pulls without authentication.

---

## 🛠️ Development

```bash
# Backend API on :8000
cd backend && pip install -e ".[dev]" && uvicorn app.main:app --reload

# Web UI on :7676 (proxies /api and /images to :8000)
cd frontend && npm install && npm run dev
```

Interactive API docs are at **http://127.0.0.1:8000/docs**.

For a production-style single process, `cd frontend && npm run build` emits `frontend/dist`, which the backend serves automatically on port 7676.

<sub>Tests: `python -m pytest` (backend) · `npm test` (frontend).</sub>

---

## 🧰 Tech stack

**Backend:** Python 3.12 · FastAPI · SQLModel (SQLite) — **Frontend:** React · Vite · TypeScript · MapLibre GL

## 📄 License

[MIT](LICENSE)
