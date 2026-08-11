# 📍 MinimalPOI

**A self-hosted, multi-user map for collecting the places you love — and planning the trips that string them together.**

Drop a pin or paste a link to auto-fill the details, rate the spots you've been, and share one searchable map with your team. When you're ready to go, turn those places into a day-by-day route — all on a server you fully own, with no external services required.

![License](https://img.shields.io/badge/license-MIT-blue) ![Container](https://img.shields.io/badge/image-ghcr.io-2496ED?logo=docker&logoColor=white) ![Backend](https://img.shields.io/badge/FastAPI-Python%203.12-009688?logo=fastapi&logoColor=white) ![Frontend](https://img.shields.io/badge/React%20%2B%20Vite-MapLibre-61DAFB?logo=react&logoColor=black)

**Collect** the places worth remembering, **rate** the ones you've been, and **route** them into a trip — one map, one team, one container you own end to end.

---

## Contents

- [✨ Features](#-features)
- [🚀 Deploy](#-deploy)
  - [Option A — Docker](#option-a--docker-recommended) · [Option B — docker compose](#option-b--docker-compose) · [Option C — Podman](#option-c--podman)
  - [Other platforms](#other-platforms) · [Unraid](#unraid)
  - [⚙️ Configuration](#-configuration)
  - [Using Postgres](#using-postgres) · [Migrating to Postgres](#migrating-existing-sqlite-data-to-postgres)
  - [Behind a reverse proxy](#behind-a-reverse-proxy)
  - [Live route collaboration](#live-route-collaboration)
  - [🤖 MCP / AI access](#-mcp--ai-access)
- [🔄 Releases](#-releases)
- [🛠️ Development](#-development)
- [🧰 Tech stack](#-tech-stack)
- [📄 License](#-license)

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

### Option C — Podman

The image is a standard OCI container, so every `docker` command above works
verbatim with `podman` — just swap the binary:

```bash
podman run -d \
  --name minimalpoi \
  -p 7676:7676 \
  -v minimalpoi-data:/data \
  --restart unless-stopped \
  ghcr.io/bardesss/minimalpoi:latest
```

`podman-compose up -d` runs the bundled `docker-compose.yml` too. For a
rootless Podman setup, set `PUID`/`PGID` to your own uid/gid (`id -u` / `id -g`)
so the `/data` volume stays writable.

Then open **http://localhost:7676** and create your admin account on the first-run setup screen. 🎉

> 💡 **Pin a version** instead of `latest` for reproducible deploys, e.g. `ghcr.io/bardesss/minimalpoi:3.8`.

> 🔐 **Permissions & upgrades.** The container fixes `/data` ownership on startup, so upgrades and bind-mounts work with no manual steps. Set `PUID`/`PGID` (e.g. `1000`) to match your host user for bind-mounts.

### Other platforms

MinimalPOI is a single container with one `/data` volume, so it drops into any
container manager without special handling.

- **Portainer** — create a **Stack**, paste this repo's [`docker-compose.yml`](docker-compose.yml)
  into the web editor, and deploy. Or add a standalone container using image
  `ghcr.io/bardesss/minimalpoi:latest`, publish port `7676`, and mount a volume
  at `/data`.
- **Coolify / Dokploy / CapRover** — add a new service from the Docker image
  `ghcr.io/bardesss/minimalpoi:latest`, expose port `7676`, and attach a
  persistent volume at `/data`. Set `TRUST_PROXY=1` since these platforms put a
  reverse proxy in front (see [Behind a reverse proxy](#behind-a-reverse-proxy)).
- **Synology / QNAP / TrueNAS SCALE** — in Container Manager / Container Station,
  pull `ghcr.io/bardesss/minimalpoi:latest`, map host port `7676` → container
  `7676`, and bind a folder to `/data`.

### Unraid

Add MinimalPOI as a custom container template. In **Docker → Add Container**,
set **Template repositories** (or just fill the fields manually) using
[`deploy/unraid-template.xml`](deploy/unraid-template.xml) from this repo — it
pre-configures the `7676` web UI port, a `/data` appdata path, and Unraid's
default `PUID=99` / `PGID=100`. After it starts, click the container's WebUI to
reach the first-run setup screen.

### ⚙️ Configuration

**No environment variables are required.** Everything persists in the `/data` volume (`minimalpoi.db`, uploaded images, and an auto-generated `secret.key`).

| Variable | Default | Purpose |
| --- | --- | --- |
| `PUID` | `10001` | User ID the app runs as. Set to your host user (often `1000`) when bind-mounting a directory. |
| `PGID` | `10001` | Group ID the app runs as. Pair with `PUID`. |
| `SECRET_KEY` | auto-generated in `/data/secret.key` | Signing key for login cookies — set it yourself only if you'd rather manage it. |
| `SESSION_LIFETIME_DAYS` | `30` | How long a login stays valid before you have to sign in again. |
| `TRUST_PROXY` | unset | Honor `X-Forwarded-*` from a reverse proxy (real client IP + scheme). Set to `1` when running behind nginx/Caddy/Traefik/etc. |
| `FORWARDED_ALLOW_IPS` | `*` | Trusted proxy IPs when `TRUST_PROXY` is set. Defaults to trusting any proxy; scope it to your proxy's IP for stricter setups. |

### Using Postgres

By default MinimalPOI stores everything in SQLite on the `/data` volume — no
database setup required. If you'd rather run Postgres, set `DATABASE_URL` to
a `postgresql+psycopg://user:pass@host:5432/minimalpoi`-style connection
string; with no `DATABASE_URL` set, the app stays on SQLite.

You can either bring your own Postgres instance, or use the bundled one via
the `postgres` compose profile:

```bash
docker compose --profile postgres up -d
```

That starts a `postgres:16-alpine` service alongside the app, with its own
named volume. Then uncomment the `DATABASE_URL` line under the `app`
service's `environment:` block in [`docker-compose.yml`](docker-compose.yml)
to point the app at it.

For non-Docker installs, install the optional extra and set `DATABASE_URL`
the same way:

```bash
pip install "minimalpoi-backend[postgres]"
```

Postgres **14 or newer** is required.

### Migrating existing SQLite data to Postgres

Back up your data volume first. Point `DATABASE_URL` at a **fresh, empty** Postgres, then run the one-shot copy:

- Docker: `docker compose run --rm -e DATABASE_URL=postgresql+psycopg://minimalpoi:change-me@postgres:5432/minimalpoi app python -m app.migrate_sqlite_to_postgres`
- Non-Docker: `DATABASE_URL=postgresql+psycopg://user:pass@host:5432/minimalpoi python -m app.migrate_sqlite_to_postgres`

It refuses to run against a non-empty target. Image files and the encryption key live on the data volume (not the database), so keep the same volume mounted. After a successful migration, set `DATABASE_URL` permanently on the app service and restart.

### Behind a reverse proxy

If you put MinimalPOI behind a TLS-terminating reverse proxy at a (sub)domain
root (e.g. `poi.example.com` → the container's `:7676`), set `TRUST_PROXY=1`
(and optionally `FORWARDED_ALLOW_IPS` to your proxy's IP) so the app sees the
real client IP for rate-limiting and the correct `https` scheme for the
**`Secure`** login cookie and the public **share URL** (`/s/<token>`) — without
it, everything looks like it's coming from the proxy over plain HTTP.

> ⚠️ **`TRUST_PROXY` makes the app trust `X-Forwarded-*` headers.** Only
> enable it when uvicorn is reachable **only** through your proxy. If the
> container port is published beyond the proxy — e.g. this repo's default
> `docker-compose.yml` maps `ports: "7676:7676"`, exposing it on the host/LAN —
> a client that reaches uvicorn directly can spoof `X-Forwarded-For`/
> `X-Forwarded-Proto` to defeat IP rate-limiting or fake an `https` scheme.
> Either don't publish the port to untrusted networks (bind it to
> `127.0.0.1` or drop the host mapping once the proxy is the only path in),
> or set `FORWARDED_ALLOW_IPS` to your proxy's specific IP instead of `*`.

**nginx**

```nginx
server {
    listen 443 ssl;
    server_name poi.example.com;

    # ... ssl_certificate / ssl_certificate_key ...

    location / {
        proxy_pass http://127.0.0.1:7676;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Server-Sent Events (live route collaboration) need buffering off and a
    # long read timeout — the app already sends X-Accel-Buffering: no, but
    # nginx also needs this at the proxy level.
    location ~ ^/api/routes/.*/events$ {
        proxy_pass http://127.0.0.1:7676;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
```

**Caddy**

```caddyfile
poi.example.com {
    reverse_proxy 127.0.0.1:7676
}
```

Caddy terminates TLS and forwards `X-Forwarded-Proto`/`X-Forwarded-For`
automatically, and it doesn't buffer SSE responses, so no extra config is
needed for either concern.

**Traefik** (labels on the container)

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.minimalpoi.rule=Host(`poi.example.com`)"
  - "traefik.http.routers.minimalpoi.entrypoints=websecure"
  - "traefik.http.routers.minimalpoi.tls.certresolver=<your-resolver>"
  - "traefik.http.services.minimalpoi.loadbalancer.server.port=7676"
```

Traefik sets `X-Forwarded-*` headers by default; SSE responses stream through
without extra buffering config.

In every case:
- **HTTPS**: terminate TLS at the proxy and make sure `X-Forwarded-Proto: https`
  is forwarded — that's what makes the login cookie `Secure` and the
  `/s/<token>` public share link render with the `https://` scheme and your
  external host, instead of the container's internal `http://…:7676`.
- **Single worker**: live route collaboration still requires the app to run
  as a single process — see [Live route collaboration](#live-route-collaboration)
  below; a reverse proxy in front doesn't change that.

### Live route collaboration

Team members editing a shared route see each other's changes live (Server-Sent
Events). This works fully offline on a LAN — it needs no internet and no extra
services. It relies on the default **single-worker** server process: do not run
uvicorn with `--workers > 1` (in-memory update fan-out is per-process). Scaling
to multiple workers would require an external pub/sub (e.g. Redis), which is not
included.

### 🤖 MCP / AI access

MinimalPOI runs an [MCP](https://modelcontextprotocol.io) server so AI clients
(like Claude Desktop or Code) can read and manage places and routes programmatically.

**Setup:**
- Create an API token in **Settings → API access → Create token** (any logged-in user). Copy it immediately — it's shown once and can't be retrieved later; revoke it anytime if needed.
- Configure your MCP client with:
  - **Transport:** Streamable HTTP
  - **URL:** `https://<your-host>/api/mcp` — shown with a copy button in **Settings → API access**
  - **Header:** `Authorization: Bearer <token>`

**Capabilities:**
- **Places (POIs):** list, get, check for duplicates, create, update, delete; create straight from a Google Maps or website link with the details filled in automatically; enrich a URL into a draft place without creating it; search Google Places by name (requires a configured Google API key).
- **Routes & stops/stays:** list, get, create, update, delete, reorder, and set the route's start and end points (requires the admin-enabled Route module).
- **Visits & ratings:** mark visited, set 1–5 rating, remove visit.
- **Comments:** add, edit, delete.
- **Reference data:** read-only categories and tags.

Edits and deletes follow the app's ownership rules: a place's creator or an admin can edit/delete it; only the route editor can modify routes; you can edit/delete only your own visits, and add/edit only your own comments — admins can additionally delete (but not edit) anyone's comment.

---

## 🔄 Releases

Versioning and image publishing are automated:

1. Changes land on `main` using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, …).
2. [release-please](https://github.com/googleapis/release-please) maintains a **release PR** that bumps the version and updates [`CHANGELOG.md`](CHANGELOG.md).
3. Merging that PR tags the release and publishes a multi-arch image to `ghcr.io/bardesss/minimalpoi` (tags `X.Y.Z`, `X.Y`, `X`, and `latest`).

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
