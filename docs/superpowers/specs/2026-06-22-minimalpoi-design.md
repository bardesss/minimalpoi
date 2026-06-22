# MinimalPOI — Design Spec

**Date:** 2026-06-22
**Status:** Approved design, pending implementation plan

## 1. Summary

MinimalPOI is a self-hosted, multi-user web app for collecting, enriching, and
organizing points of interest (POIs) on a map, with one-click / automatic push
to a [TRIP](https://github.com/itskovacs/trip) instance.

Multiple people log in and contribute to **one shared POI list**. You add a POI
manually or by pasting a link (Google Maps, TripAdvisor, or any website); the
backend enriches it by reading that link (OpenGraph, JSON-LD, embedded
coordinates, optional Google Places). Each user can mark places **visited**
(solo or with a **team**) and leave attributed **comments**. When an admin has
configured the TRIP connection, new POIs are pushed to TRIP automatically.

The visual design is ported faithfully from the Claude-generated reference in
`/reference/POI Manager (MapLibre) - standalone.html` (the "Places manager").

## 2. Goals & non-goals

### Goals
- A faithful reproduction of the reference design (layout, theme, fonts).
- Add a POI manually or by pasting a link; enrich automatically.
- Shared multi-user POI library with per-user **visited** status and comments.
- Teams (e.g. "family") so a visit can be logged as solo or with a team.
- Automatic push of new POIs to a configured TRIP instance.
- Runs self-hosted in a single Docker container. All app assets bundled
  locally (no CDN / Google Fonts) so the app's core works offline on a LAN.

### Non-goals (v1 — YAGNI)
- Trip / itinerary planning, bookings, packing lists (TRIP already does this).
- Two-way sync with TRIP; updating/deleting places in TRIP.
- GPX routes / waypoint routing.
- The extra TRIP place fields: favorite, price, duration, allowdog, restroom.
- OIDC / SSO, mobile apps, async job queue, multiple TRIP targets.
- Per-user (siloed) POI lists — the list is shared by all users.

> **Offline note:** Reading a pasted link and loading map tiles inherently
> require internet — that is expected and understood. "No online dependencies"
> means **no CDN dependencies for app assets**: fonts, MapLibre JS/CSS, and the
> app bundle are all served from the container.

## 3. Architecture

```
┌───────────────────────────────────────────────────────────┐
│  Browser — React + Vite + Tailwind + MapLibre (bundled)    │
│  map · list/search · place editor · visited · comments ·    │
│  categories · teams · settings/admin                        │
└───────────────────────────┬───────────────────────────────┘
                            │ REST (JSON) + httpOnly JWT cookie
┌───────────────────────────▼───────────────────────────────┐
│  FastAPI backend                                            │
│  • Auth (accounts, roles, shared data)                      │
│  • POI / Category / Team / Visit / Comment CRUD             │
│  • Enrichment service (link → structured draft POI)         │
│  • TRIP push client (POST /api/by_token/place)              │
│  • GeoJSON import / export                                   │
│  • SQLite via SQLModel; uploaded/enriched images on disk    │
└──────┬───────────────┬──────────────┬─────────────────────┘
       ▼               ▼              ▼
  Pasted link      Nominatim     TRIP instance
  (OG/JSON-LD,     (optional     (X-Api-Token)
   gmaps coords)   geocode)
       ▲
  Google Places API (optional, admin key)
```

- **Single container**: FastAPI serves the REST API *and* the built static
  frontend. A mounted volume holds `data/minimalpoi.db` (SQLite) and an
  `images/` directory for downloaded/enriched images.
- The backend is the only component making outbound calls (enrichment, TRIP),
  so there are no browser CORS issues and all secrets stay server-side.

### Tech stack
- **Backend:** Python, FastAPI, SQLModel (SQLite), httpx (outbound),
  selectolax/BeautifulSoup (HTML parsing), Pydantic.
- **Frontend:** React + Vite + TypeScript, Tailwind CSS, MapLibre GL JS.
  Fonts (Manrope, JetBrains Mono) bundled locally as woff2 (extracted from the
  reference bundle). No CDN references.
- **Packaging:** Docker + docker-compose, mirroring TRIP's self-host shape.

## 4. Data model (SQLite / SQLModel)

### User
`id, username (unique), password_hash, role (admin|member), preferred_team_id
(nullable — null = solo), created_at`

### Team
`id, name, created_by, created_at`
Membership via **TeamMember** (`team_id, user_id`) — many-to-many. Any user may
create a team and manage its members; admins may manage any team.

### Category (shared)
`id, name, color, trip_category_name (the case-sensitive TRIP category to map to
on push), created_by`

### POI (shared — not per-user)
`id, name, address, lat, lng, category_id, tags (JSON list), notes, phone,
email, website, image_url (enriched/uploaded), source_url (pasted link),
created_by, created_at, updated_at`

TRIP sync state (embedded): `trip_sync_status (none|synced|error),
trip_place_id (nullable), trip_last_pushed_at (nullable), trip_last_error
(nullable)`

### Visit (per-user visited status)
`id, poi_id, user_id, team_id (nullable — null = solo), created_at`
**Unique (poi_id, user_id)** — one visited record per user per place. The row's
existence means "this user visited"; `team_id` records solo vs which team.

### Comment (attributed per-user note)
`id, poi_id, user_id, text, created_at`

### Settings (singleton, admin-editable)
`trip_base_url, trip_api_token, trip_autopush (bool, default true when
configured), google_api_key (optional), nominatim_url (optional, defaults to
public OSM Nominatim; swappable for a self-hosted instance), map_tile_url
(default public OSM raster), default_map_center_lat, default_map_center_lng,
default_map_zoom`

## 5. Enrichment pipeline

Endpoint: `POST /enrich {url}` — **synchronous** (paste link → spinner →
returns a **draft** POI the user reviews/edits before saving). Manual add uses
the same editor with an empty draft.

Resolution chain:
1. **Detect link type** from the URL.
2. **Google Maps** (`maps.app.goo.gl` shortlink or `/maps/place/...`):
   - Extract lat/lng directly from the URL when present (e.g. the
     `!3d<lat>!4d<lng>` / `@lat,lng` patterns); resolve shortlinks by following
     the redirect first.
   - If an admin **Google Places API key** is configured, call it for the most
     accurate name / address / lat-lng / photo / phone / website.
3. **TripAdvisor / generic website:** fetch the page; parse **OpenGraph**
   (`og:title`, `og:image`, `og:description`) and **JSON-LD / schema.org**
   (`LocalBusiness`/`Restaurant` → name, address, `geo` lat/lng, telephone,
   url).
4. **Coordinate fallback:** if still no lat/lng, **geocode** name+address via
   **Nominatim** (OSM). Honors a configurable/self-hostable endpoint; absence of
   coords is surfaced to the user rather than failing the whole add.
5. Returns a draft with per-field source/confidence so the user can see what was
   auto-filled. Politeness: per-request timeout, descriptive user-agent, a
   single fetch (no crawling).

Downloaded images are stored locally under `images/` and referenced by
`image_url`.

## 6. TRIP integration & push

- **Settings (admin):** TRIP base URL + API token. "Test connection" calls
  `GET /api/by_token/categories` and lists available TRIP categories.
- **Category mapping:** each MinimalPOI category stores `trip_category_name`
  (TRIP requires an existing, case-sensitive category name).
- **Auto-push:** when TRIP is configured and `trip_autopush` is on (default),
  a newly-saved POI is pushed in the background. Because TRIP's API is
  **create-only** (no update/upsert):
  - Push **once** on the first successful save → store `trip_place_id`, set
    `trip_sync_status = synced`.
  - Editing a synced POI does **not** auto-re-push (that would duplicate in
    TRIP). Re-push is a manual, explicitly-warned action
    ("Push again — this creates a duplicate place in TRIP").
  - On failure (unmapped category, TRIP unreachable, etc.) set
    `trip_sync_status = error` + `trip_last_error`, show a retry badge. Local
    save is never blocked by a push failure.
- **Endpoint:** `POST /api/by_token/place`, header `X-Api-Token: <token>`.

### Field mapping (MinimalPOI → TRIP)

| MinimalPOI            | TRIP field    |
|-----------------------|---------------|
| name                  | `name`        |
| lat / lng             | `lat` / `lng` |
| address               | `place` (required string) |
| category → trip_category_name | `category` (name) |
| image_url             | `image` (URL) |
| notes                 | `description` |
| website, phone, email | `links` (array; phone/email as `tel:` / `mailto:`) |

Tags, visits, and comments are **local-only** (TRIP has no equivalent and the
extra TRIP fields are out of scope).

## 7. Visited & teams

- **Teams** are named user groups (e.g. "family" = user + spouse). Created and
  managed in-app.
- **Visited** is per-user: a user toggles "visited" on a POI; the visit is
  recorded as **solo** or **with team X**.
- A user's **preferred team (or solo)** is set in **user settings** and applied
  by default when they mark a place visited — overridable per place.
- **Filtering:** the list/map can filter by visited-by-me, solo visits, visits
  with a given team, and not-visited. Pins/rows show a visited indicator.

## 8. UI / screens (ported from the reference)

- **Main view:** collapsible left list panel — search ("places or addresses"),
  category filter, visited filter, "N places shown" — beside a MapLibre map with
  colored category pins and "Fit map to results".
- **Add:** a prominent "Paste a link" input (Google Maps / TripAdvisor /
  website) that enriches and opens the **place editor**; plus "Add manually".
- **Place editor (modal):** Name, Address, Latitude, Longitude, Category, Tags,
  Notes, Phone, Email, Website, image preview. Actions: Save, Delete, mark
  Visited (with team/solo), and TRIP sync status/retry. A **comments** section
  shows attributed notes from all users with an add-comment box.
- **Categories:** manage name + color + TRIP-category mapping.
- **Teams:** create teams and manage members.
- **Settings / Admin** (admin only): base map tile URL, map defaults, TRIP
  connection (URL/token/test/auto-push toggle), optional Google API key, user
  management, and GeoJSON import/export ("Bulk import or export your places").
- **User settings** (any user): preferred visit context (team or solo), password.
- **Theme:** "Light / minimal" — indigo `#4f46e5` on warm-grays
  (`#f1f0ee` / `#46413a` / `#9a958f`), category accent colors (amber/purple/
  green/blue), fonts **Manrope** (UI) + **JetBrains Mono** (mono), all bundled.

## 9. Auth & multi-user

- Username/password login; session via signed **JWT in an httpOnly cookie**.
- **First run** seeds an initial admin (env-provided credentials).
- **Shared data:** all authenticated users see and edit the one shared POI list,
  categories, and teams. `created_by` is recorded for attribution.
- **Roles:** `member` (manage POIs/categories/teams, mark visited, comment,
  push) and `admin` (everything + settings + user management).

## 10. Deployment

- `docker-compose.yml` with one service; a volume for `data/` (SQLite +
  `images/`). Environment: `SECRET_KEY` (JWT signing), initial admin
  username/password. Runtime config (TRIP URL/token, Google key, tile URL, map
  defaults) is editable in-app by an admin.
- Frontend is built at image-build time and served as static files by FastAPI.

## 11. Testing

- **Backend:**
  - Enrichment parsers against **saved HTML fixtures** (Google Maps URL coord
    extraction, TripAdvisor + generic OpenGraph/JSON-LD).
  - TRIP push client against a **mocked TRIP API** (success, unmapped category,
    failure → retry), and field-mapping unit tests.
  - Auth/roles, POI/Visit/Comment/Team CRUD, GeoJSON import/export.
- **Frontend:** component tests for the place editor, enrich flow, visited
  toggle, and comments, with a mocked API.

## 12. Open items / future

- Optional: push the app-native visited to TRIP's `visited` field (deferred —
  extra TRIP fields are currently out of scope).
- Optional self-hosted tile server / offline basemap (config already supports a
  custom tile URL).
- Two-way TRIP sync and place updates (blocked by TRIP's create-only API).
