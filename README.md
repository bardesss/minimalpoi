# MinimalPOI

A self-hosted, multi-user web app for collecting, enriching, and organizing
points of interest (POIs) on a map, kept in two-way sync with a
[TRIP](https://github.com/itskovacs/trip) instance.

> **Status:** in active development. **Phase 1 (backend foundation & core API)
> complete.** Enrichment, TRIP sync, the web UI, and Docker packaging land in
> later phases.

## Features so far (Phase 1)

- Multi-user accounts with a one-time first-run admin **setup**, JWT-cookie
  login, and `admin` / `member` roles (admins create accounts — no open signup).
- One **shared** POI list (not per-user) with full CRUD and **duplicate
  detection** (by source link or name + proximity).
- **Categories** (with color + TRIP-category mapping), **teams**, per-user
  **visited** status (solo or with a team, plus a 1–5 rating), per-user
  **wishlist**, and attributed **comment** threads.
- Admin **settings** with TRIP credentials stored encrypted at rest.

_Coming next: link enrichment (Phase 2), two-way TRIP sync (Phase 3), the
MapLibre web UI (Phase 4), backup/restore + Docker image (Phase 5)._

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
