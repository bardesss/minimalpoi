# MinimalPOI

A self-hosted, multi-user web app for collecting, enriching, and organizing
points of interest (POIs) on a map, kept in two-way sync with a
[TRIP](https://github.com/itskovacs/trip) instance.

> **Status:** in active development — scaffolding underway. This README is
> updated at the end of each build phase with the features, deploy steps, and
> practical info that actually work so far.

## Planned features

- Add POIs manually or by **pasting a link** (Google Maps, TripAdvisor, any
  website); auto-enrich from OpenGraph/JSON-LD, embedded coordinates, optional
  Google Places, and Nominatim geocoding.
- One **shared** POI list for all users, with categories, tags, and search.
- Per-user **visited** status (solo or with a **team**), 1–5 **ratings**, a
  **wishlist**, and attributed **comment** threads.
- **Continuous two-way sync** with TRIP (create/update/delete both ways,
  conflict resolution).
- Self-hosted in a single Docker container, no required environment variables.

## Tech stack

Python 3.12 · FastAPI · SQLModel (SQLite) · React + Vite + MapLibre.

## License

[MIT](LICENSE).
