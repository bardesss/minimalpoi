# MinimalPOI

A self-hosted, multi-user web app for collecting, enriching, and organizing
points of interest (POIs) on a map, kept in two-way sync with a
[TRIP](https://github.com/itskovacs/trip) instance.

> **Status:** in active development. **Phases 1–4 complete** (backend, enrichment,
> two-way TRIP sync, MapLibre web UI). Docker packaging included.

## Features so far

- Multi-user accounts (first-run admin setup, JWT-cookie login, admin/member
  roles, admin-created accounts).
- One **shared** POI list with full CRUD and **duplicate detection**.
- Categories (color + lucide icon), teams, per-user visited (team + 1–5 rating),
  wishlist, and attributed comments.
- **Link enrichment** (`POST /api/enrich`): paste a Google Maps, TripAdvisor, or
  any website link and get a draft POI — coordinates from the Google Maps URL,
  OpenGraph + JSON-LD for name/image/description/address/phone, optional Google
  Places (admin key), and a Nominatim geocoding fallback. Per-field provenance
  is returned so you can see what was auto-filled.
- **Images**: enriched images are downloaded to `data/images/` on save and
  served locally; manual upload via `POST /api/images`.
- **Two-way TRIP sync**: when an admin configures the TRIP connection (URL +
  login, stored encrypted) and enables sync, categories and POIs are reconciled
  with TRIP in both directions — creates, edits, and deletes propagate, with
  snapshot-based change detection, a conflict policy (MinimalPOI-wins default),
  and deletion tombstones. A background worker runs on an interval; `POST
  /api/sync/now` triggers it on demand; `GET /api/sync/status` reports
  error/conflict counts.
- Admin **settings** with TRIP credentials encrypted at rest.
- **Web UI**: interactive MapLibre map with clustered, category-colored pins;
  left panel to browse, search, and filter POIs by text and category; click a
  pin or card to open a detail panel; create / edit / delete POIs (add by
  clicking the map to drop coordinates, duplicate warning on save, delete
  confirmation); basemap driven by the admin `map_tile_url` setting (Carto
  Voyager default). Desktop-focused.

_Coming next: import/export + enrichment UI, admin/settings UI,
visited/wishlist/comments UI, backup/restore._

## Tech stack

Python 3.12 · FastAPI · SQLModel (SQLite) · React + Vite + TypeScript + MapLibre.

## Run the backend (development)

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload
# API at http://127.0.0.1:8000 ; docs at http://127.0.0.1:8000/docs
```

Run the tests:

```bash
cd backend
python -m pytest -v
```

## Run the web UI (development)

The frontend is a React + Vite app served on **port 7676**. In development it
proxies `/api` and `/images` to the backend on `:8000`, so run both:

```bash
# terminal 1 — backend API
cd backend && uvicorn app.main:app --reload

# terminal 2 — web UI at http://127.0.0.1:7676
cd frontend && npm install && npm run dev
```

Run the frontend tests:

```bash
cd frontend && npm test
```

## Production build

`cd frontend && npm run build` emits `frontend/dist`, which the backend serves
automatically — run the whole app from one process on port 7676:

```bash
cd backend && uvicorn app.main:app --port 7676
```

## Configuration

**No environment variables are required.** All state lives in a `data/`
directory (`data/minimalpoi.db`, `data/secret.key`). The JWT signing key is
generated on first start and persisted; set `SECRET_KEY` only if you want to
manage it yourself.

## Deployment

### docker-compose (recommended)

```bash
docker compose up -d        # pulls ghcr.io/bardesss/minimalpoi:latest
```

App is at **http://localhost:7676**. All state (SQLite DB, secret key, uploaded
images) persists in the named volume `minimalpoi-data` mapped to `/data` inside
the container. `SECRET_KEY` is optional — it is auto-generated and stored in the
volume on first start.

To run against local source instead of the published image, edit
`docker-compose.yml` (comment `image:`, uncomment `build: .`) and run
`docker compose up -d --build`.

### Plain docker

```bash
docker run -d -p 7676:7676 -v minimalpoi-data:/data ghcr.io/bardesss/minimalpoi:latest
```

`MINIMALPOI_DATA_DIR=/data` is set in the image; the named volume persists data
across restarts. Pin a specific version instead of `latest` with a semver tag,
e.g. `ghcr.io/bardesss/minimalpoi:0.1`.

## Releases

Versioning and publishing are automated:

1. Merge feature PRs using Conventional Commits (`feat:`, `fix:`, …).
2. [release-please](https://github.com/googleapis/release-please) keeps an open
   **release PR** that bumps the version and updates [`CHANGELOG.md`](CHANGELOG.md).
3. Merging that PR tags the release and publishes a multi-arch
   (`linux/amd64`, `linux/arm64`) image to
   `ghcr.io/bardesss/minimalpoi` (tags `X.Y.Z`, `X.Y`, `X`, `latest`).

> **One-time:** after the first release, set the GHCR package visibility to
> **public** in the GitHub UI (Packages → minimalpoi → Package settings) so the
> image can be pulled without authentication.

## License

[MIT](LICENSE).
