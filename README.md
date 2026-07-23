# 📍 MinimalPOI

**A self-hosted, multi-user map for collecting the places you love — and planning the trips that string them together.**

Drop a pin or paste a link to auto-fill the details, rate the spots you've been, and share one searchable map with your team. When you're ready to go, turn those places into a day-by-day route — all on a server you fully own, with no external services required.

![License](https://img.shields.io/badge/license-MIT-blue) ![Container](https://img.shields.io/badge/image-ghcr.io-2496ED?logo=docker&logoColor=white) ![Backend](https://img.shields.io/badge/FastAPI-Python%203.12-009688?logo=fastapi&logoColor=white) ![Frontend](https://img.shields.io/badge/React%20%2B%20Vite-MapLibre-61DAFB?logo=react&logoColor=black)

---

## ✨ Features

### 🗺️ Map & places
- **Interactive map** — a MapLibre map with category-colored pins; click a pin or a list card (showing the place's city and country flag) to open its details, or click anywhere to drop a new place.
- **Search & filter** — narrow the shared list by free text, category, and **visit status** (any · visited · not visited).
- **Two view modes** — switch between *fit-to-results* (auto-frames whatever the filters show) and a *fixed center & zoom*; your choice is remembered.
- **Ratings at a glance** — every place shows its **average rating and review count**, aggregated across everyone's visits.
- **Duplicate detection** — warns you before you save the same spot twice.
- **Customizable basemap** — admins set the map tile source and the default center & zoom.
- **Mobile-first** — on phones the list, filters, and detail open as draggable bottom sheets over a full-screen map.

### 🔗 Enrichment & quick entry
- **Enrich from a link** — paste a Google Maps or website URL and MinimalPOI auto-fills the name, coordinates, address, phone, image, and description (from OpenGraph, JSON-LD, and Twitter Card metadata), with an optional Google Places key and a Nominatim geocoding fallback; every auto-filled field shows where it came from.
- **Search Google Places** — with a key configured, search by name and pick a result to fill a new place in one step.
- **Worldwide phone numbers** — a country-picker field normalizes entries to E.164 and displays them cleanly formatted.

### 👥 Multi-user & collaboration
- **Accounts & roles** — first-run admin setup, secure cookie login (sessions persist ~30 days), and admin/member roles; admins can enable, disable, re-role, or remove users.
- **Teams** — create teams, add members, and set a **preferred team** that's applied automatically to your new visits.
- **Visits & reviews** — mark a place visited with a **1–5 star rating** and an attributed comment; edit your own review, while admins can moderate.
- **Ownership** — only a place's author (or an admin) can edit or delete it.

### 🏷️ Organization
- **Shared place list** — full create, edit, and delete.
- **Categories** — each with a custom color and icon.
- **Tags** — tracked with usage counts, plus admin-wide **rename and delete**.

### 🧭 Route planner (optional)
- **Build a journey** — an admin-enabled Route module turns your places into a named, dated trip: a **pinned start and end place** (with an optional **round trip** back to the start) wrapping an ordered chain of multi-night **stays** and in-between **stops** (linked POIs or ad-hoc points).
- **Day-by-day itinerary** — the timeline groups the trip under dated day headers (e.g. *THU 16 JUL*), each showing that day's **driving total**; multi-night stays span their whole date range and rest-days fall away.
- **Travel per leg** — each hop shows driving distance and time via **Google Directions**, with an offline **haversine estimate** fallback (flagged *est.*); arrival and departure dates and route totals are derived from the stay nights.
- **Map-primary editor** — a full-screen map draws the numbered polyline while a floating timeline (bottom sheet on mobile) lets you add and **drag a whole row to reorder** stops and re-night stays; **matching numbers** tie each list row to its map pin, **hovering a row highlights** its marker, a **bookmark** flags stops you've saved as places, and adding a place from the map slots it into the best **upcoming** day (never one that's already passed).
- **Share your route** — export a **Strava-style image** of the whole trip in three social formats (square, story, landscape), either over the **map** or as a **transparent overlay** to drop on your own photo, with MinimalPOI branding, the route name and dates, and a distance / days / stops stat strip.
- **Shared & exportable** — every member sees all routes (only the creator or an admin can edit), export any route as **GeoJSON, GPX, or KML**, and attach tickets or confirmations (PDF or image, magic-byte checked, 10 MB cap) to any stop or stay.

### 💾 Data, images & backups
- **Import & export** — bulk-import from **GeoJSON or CSV** (with server-side duplicate detection and automatic category matching), and export your whole collection as **GeoJSON**.
- **Full backup & restore** — download a complete **ZIP archive** of everything (places, photos, users, teams, comments, ratings, settings) and restore it into a fresh instance.
- **Local images** — enriched images are downloaded and served from your own server, and manual upload works too (auto-converted to WebP, 10 MB cap).

### 🔁 TRIP sync (optional)
- **Two-way reconciliation** — connect a [TRIP](https://github.com/itskovacs/trip) instance and MinimalPOI keeps categories and places in sync **both ways** — creates, edits, and deletes propagate — on a configurable interval and conflict policy.
- **Conflict resolution** — a built-in view lets you settle each clash by keeping the MinimalPOI or the TRIP version; entirely optional, so enable it only if you use TRIP.

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

### Live route collaboration

Team members editing a shared route see each other's changes live (Server-Sent
Events). This works fully offline on a LAN — it needs no internet and no extra
services. It relies on the default **single-worker** server process: do not run
uvicorn with `--workers > 1` (in-memory update fan-out is per-process). Scaling
to multiple workers would require an external pub/sub (e.g. Redis), which is not
included.

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
