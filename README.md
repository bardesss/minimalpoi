# 📍 MinimalPOI

**A self-hosted, multi-user map for collecting, enriching, and organizing your points of interest.**

Drop a pin, paste a link to auto-fill the details, and keep all your favorite places — restaurants, trails, shops, anything — on one shared, searchable map that you fully own.

![License](https://img.shields.io/badge/license-MIT-blue) ![Container](https://img.shields.io/badge/image-ghcr.io-2496ED?logo=docker&logoColor=white) ![Backend](https://img.shields.io/badge/FastAPI-Python%203.12-009688?logo=fastapi&logoColor=white) ![Frontend](https://img.shields.io/badge/React%20%2B%20Vite-MapLibre-61DAFB?logo=react&logoColor=black)

---

## ✨ Features

### 🗺️ Map & places
- **Interactive map** — a MapLibre map with category-colored pins. Click a pin or a list card (showing the place's city and country flag) to open its details, or click anywhere on the map to drop a new place.
- **Search & filter** — narrow the shared list by free text, category, and **visit status** (any · visited · not visited).
- **Two view modes** — switch the map between *fit-to-results* (auto-frames whatever the filters show) and a *fixed default center & zoom*; your choice is remembered.
- **Ratings at a glance** — every place shows its **average rating and review count**, aggregated across everyone's visits.
- **Customizable basemap** — admins set the map tile source and the default center & zoom.
- **Duplicate detection** — warns you before you save the same spot twice.
- **Mobile-first** — on phones the list, filters, and detail open as draggable bottom sheets over a full-screen map.

### 🔗 Enrichment & quick entry
- **Enrich from a link** — paste a Google Maps or website URL and MinimalPOI auto-fills the name, coordinates, address, phone, image, and description (OpenGraph + JSON-LD + Twitter Card), with an optional Google Places key and a Nominatim geocoding fallback. Every auto-filled field shows where it came from.
- **Search Google Places** — with a key configured, search by name and pick a result to fill a new place in one step.
- **Worldwide phone numbers** — a country-picker field normalizes entries to E.164 and shows them nicely formatted.

### 👥 Multi-user & collaboration
- **Accounts & roles** — first-run admin setup, secure cookie login (sessions persist ~30 days), and admin/member roles. Admins can enable/disable, re-role, or remove users.
- **Teams** — create teams, add members, and set a **preferred team** that's applied automatically to your new visits.
- **Visits & reviews** — mark places visited with a **1–5 star rating** and an attributed comment; you can edit your own review, and admins can moderate.
- **Ownership** — only a place's author (or an admin) can edit or delete it.

### 🏷️ Organization
- **Shared place list** with full create / edit / delete.
- **Categories** with a custom color and icon.
- **Tags** with usage counts, plus admin-wide tag **rename & delete**.

### 🧭 Route planner (optional)
- **Build a journey** — an admin-enabled Route module turns your places into a named, dated trip: an ordered chain of multi-night **stays** and in-between **stops** (linked POIs or ad-hoc points).
- **Travel per leg** — each hop shows driving distance and time via **Google Directions**, with an offline **haversine estimate** fallback (flagged *est.*); arrival/departure dates and route totals are derived from the stay nights.
- **Map-primary editor** — a full-screen map draws the numbered polyline while a floating timeline (bottom sheet on mobile) lets you add, reorder, and re-night stops.
- **Shared & exportable** — every member sees all routes (only the creator or an admin can edit), export any route as **GeoJSON**, and attach tickets/confirmations (PDF or image, magic-byte checked, 10 MB cap) to the route or a single stop.

### 💾 Data, images & backups
- **Import & export** — bulk-import from **GeoJSON or CSV** (server-side duplicate detection + automatic category matching) and export your whole collection as **GeoJSON**.
- **Full backup & restore** — download a complete **ZIP archive** of everything (places, photos, users, teams, comments, ratings, settings) and restore it into a fresh instance.
- **Local images** — enriched images are downloaded and served from your own server; manual upload works too (auto-converted to WebP, 10 MB cap).

### 🔁 Optional TRIP sync
- Connect a [TRIP](https://github.com/itskovacs/trip) instance and MinimalPOI keeps categories and places reconciled **both ways** — creates, edits, and deletes propagate — on a configurable interval and conflict policy.
- A built-in **conflict resolution view** lets you settle each clash by keeping the MinimalPOI or the TRIP version. Entirely optional — enable it only if you use TRIP.

### 🔒 Security & self-hosting
- **Hardened by default** — per-action rate limiting, an encrypted-at-rest Google API key, auto-`Secure` login cookies over HTTPS, and a non-root, health-checked container.
- **Update notifications** — checks GitHub releases and tells you when a newer version is out.
- **Simple to run** — ships as a single multi-arch **Linux** image (`linux/amd64` + `linux/arm64`, so it runs on x86 servers and ARM boards / Apple Silicon alike), stores everything in SQLite on one volume, and needs **no external services**.

---

## 🚀 Deploy

MinimalPOI runs as one container on **port 7676** — the app process runs **non-root** (default uid/gid `10001`, overridable via `PUID`/`PGID`), with a built-in **healthcheck**. All state (database, images, signing key) lives in a single `/data` volume, and the container fixes that volume's ownership on startup so upgrades and bind-mounts just work.

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

> 💡 **Pin a version** instead of `latest` for reproducible deploys, e.g. `ghcr.io/bardesss/minimalpoi:1.0`.

> ⚠️ **No published image yet?** Until the first release is cut and its GHCR package is made public, build from source instead: in `docker-compose.yml` comment the `image:` line and uncomment `build: .`, then run `docker compose up -d --build`.

> 🔐 **Permissions & upgrades.** The container fixes `/data` ownership on startup, so upgrades and bind-mounts work with no manual steps. Set `PUID`/`PGID` (e.g. `1000`) to match your host user for bind-mounts. *(This auto-fix needs **1.0.1+**. On exactly **1.0.0**, `PUID`/`PGID` are ignored and that image runs as uid `10001`; if you're stuck there, run once: `docker run --rm -v minimalpoi-data:/data alpine chown -R 10001:10001 /data`, then restart — or just upgrade to 1.0.1+.)*

### ⚙️ Configuration

**No environment variables are required.** Everything persists in the `/data` volume (`minimalpoi.db`, uploaded images, and an auto-generated `secret.key`).

| Variable | Default | Purpose |
| --- | --- | --- |
| `PUID` | `10001` | User ID the app runs as. Set to your host user (often `1000`) when bind-mounting a directory. |
| `PGID` | `10001` | Group ID the app runs as. Pair with `PUID`. |
| `SECRET_KEY` | auto-generated in `/data/secret.key` | Signing key for login cookies — set it yourself only if you'd rather manage it. |
| `SESSION_LIFETIME_DAYS` | `30` | How long a login stays valid before you have to sign in again. |

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
