# MinimalPOI

A self-hosted, multi-user web app for collecting, enriching, and organizing
points of interest (POIs) on a map, kept in two-way sync with a
[TRIP](https://github.com/itskovacs/trip) instance.

> **Status:** in active development. **Phases 1–3 complete** (backend, enrichment,
> two-way TRIP sync). The web UI and Docker packaging land in later phases.

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

_Coming next: two-way TRIP sync (Phase 3), the MapLibre web UI (Phase 4),
backup/restore + Docker image (Phase 5)._

## Tech stack

Python 3.12 · FastAPI · SQLModel (SQLite) · React + Vite + MapLibre (Phase 4).

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

## Configuration

**No environment variables are required.** All state lives in a `data/`
directory (`data/minimalpoi.db`, `data/secret.key`). The JWT signing key is
generated on first start and persisted; set `SECRET_KEY` only if you want to
manage it yourself.

## Deployment

A single-container Docker image and `docker-compose.yml` (map one `data/`
volume, no env vars) arrive in Phase 5. Until then, run the backend directly
as shown above.

## License

[MIT](LICENSE).
