# MinimalPOI — Design Spec

**Date:** 2026-06-22
**Status:** Approved design, pending implementation plan

## 1. Summary

MinimalPOI is a self-hosted, multi-user web app for collecting, enriching, and
organizing points of interest (POIs) on a map, kept in **continuous two-way
sync** with a [TRIP](https://github.com/itskovacs/trip) instance.

Multiple people log in and contribute to **one shared POI list**. You add a POI
manually or by pasting a link (Google Maps, TripAdvisor, or any website); the
backend enriches it by reading that link (OpenGraph, JSON-LD, embedded
coordinates, optional Google Places). Each user can mark places **visited**
(solo or with a **team**) and leave attributed **comments**. When an admin has
configured the TRIP connection, POIs are synced bidirectionally with TRIP:
creates, edits, and deletes flow both ways.

The visual design is ported faithfully from the Claude-generated reference in
`/reference/POI Manager (MapLibre) - standalone.html` (the "Places manager").

## 2. Goals & non-goals

### Goals
- A faithful reproduction of the reference design (layout, theme, fonts).
- Add a POI manually or by pasting a link; enrich automatically.
- Shared multi-user POI library with per-user **visited** status and comments.
- Teams (e.g. "family") so a visit can be logged as solo or with a team.
- Per-user rating on visited places and a per-user "want to go" wishlist.
- Pick/fix a POI's location by clicking the map; manual image upload.
- Duplicate detection when adding to the shared list (and against TRIP).
- **Continuous two-way sync with TRIP**: creates, field updates, and deletes
  propagate in both directions, with conflict detection/resolution.
- Full backup/restore of all data (POIs, comments, visits, teams, wishlist).
- Runs self-hosted in a single Docker container. All app assets bundled
  locally (no CDN / Google Fonts) so the app's core works offline on a LAN.

### Non-goals (v1 — YAGNI)
- Trip / itinerary planning, bookings, packing lists (TRIP already does this).
- Syncing MinimalPOI-only concepts (tags, comments, visits, wishlist, ratings)
  to TRIP — these stay local; only the shared place fields sync.
- GPX routes / waypoint routing.
- The extra TRIP place fields: favorite, price, duration, allowdog, restroom.
- OIDC / SSO, mobile apps, async job queue, multiple TRIP targets.
- Per-user (siloed) POI lists — the list is shared by all users.
- Self-registration / invite links — accounts are created by an admin only.
- Bulk multi-link paste, pin clustering, activity feed, notifications.

> **Offline note:** Reading a pasted link and loading map tiles inherently
> require internet — that is expected and understood. "No online dependencies"
> means **no CDN dependencies for app assets**: fonts, MapLibre JS/CSS, and the
> app bundle are all served from the container.

## 3. Architecture

```
┌───────────────────────────────────────────────────────────┐
│  Browser — React + Vite + Tailwind + MapLibre (bundled)    │
│  map · list/search · place editor · visited · comments ·    │
│  categories · teams · settings/admin · sync/conflicts       │
└───────────────────────────┬───────────────────────────────┘
                            │ REST (JSON) + httpOnly JWT cookie
┌───────────────────────────▼───────────────────────────────┐
│  FastAPI backend                                            │
│  • Auth (accounts, roles, shared data)                      │
│  • POI / Category / Team / Visit / Comment CRUD             │
│  • Enrichment service (link → structured draft POI)         │
│  • TRIP sync engine (background worker + on-change push)     │
│    – TRIP client: login/JWT, GET/POST/PUT/DELETE /api/places │
│  • GeoJSON import/export · full backup/restore               │
│  • SQLite via SQLModel; uploaded/enriched images on disk     │
└──────┬───────────────┬──────────────┬─────────────────────┘
       ▼               ▼              ▼
  Pasted link      Nominatim     TRIP instance  ◀── poll (in) ──┐
  (OG/JSON-LD,     (optional     (authenticated  ── push (out) ─┘
   gmaps coords)   geocode)       /api/auth/login + /api/places)
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

TRIP sync state (embedded — see §6 for how these drive sync):
`trip_place_id (nullable), trip_sync_status (local_only | synced | pending |
conflict | error), trip_synced_snapshot (JSON of the mapped TRIP fields as of
the last successful sync — used to detect TRIP-side edits, since TRIP exposes
no modified timestamp), trip_synced_at (nullable), trip_last_error (nullable)`

### Tombstone (deletion record, for sync)
`id, trip_place_id, origin (local | trip), created_at` — records that a synced
place was deleted on one side so the sync engine deletes it on the other side
**once** and never re-creates it from a stale read.

### Visit (per-user visited status)
`id, poi_id, user_id, team_id (nullable — null = solo), rating (nullable int
1–5), created_at`
**Unique (poi_id, user_id)** — one visited record per user per place. The row's
existence means "this user visited"; `team_id` records solo vs which team;
`rating` is that user's optional 1–5 score for the place.

### Wishlist (per-user "want to go")
`id, poi_id, user_id, created_at`
**Unique (poi_id, user_id)** — one wishlist flag per user per place.

### Comment (attributed per-user note)
`id, poi_id, user_id, text, created_at`

### Settings (singleton, admin-editable)
`trip_base_url, trip_username, trip_password (encrypted at rest with the
auto-generated app secret), trip_sync_enabled (bool), trip_sync_interval_seconds
(default 300), trip_conflict_policy (manual | minimalpoi_wins | trip_wins,
default manual), google_api_key (optional), nominatim_url (optional, defaults to
public OSM Nominatim; swappable for a self-hosted instance), map_tile_url
(default public OSM raster), default_map_center_lat, default_map_center_lng,
default_map_zoom`

> TRIP auth uses the **authenticated** API (`POST /api/auth/login` →
> access+refresh JWT), not the create-only `X-Api-Token`. The full CRUD API
> (`GET/POST/PUT/DELETE /api/places`) is what makes two-way sync possible.
> Credentials are stored encrypted and never returned to the browser.

## 5. Enrichment pipeline

Endpoint: `POST /enrich {url}` — **synchronous** (paste link → spinner →
returns a **draft** POI the user reviews/edits before saving). Manual add uses
the same editor with an empty draft.

**Duplicate detection:** before saving (manual or enriched), the backend checks
the shared list for a likely duplicate — same `source_url`, or a close
name match within a small distance of the same lat/lng — and the editor warns
the user, offering to open the existing POI instead of creating a new one.

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
`image_url`. A user can also **upload their own image** ("Choose file") to
replace the enriched one; uploads are stored the same way.

## 6. TRIP integration & two-way sync

MinimalPOI keeps the shared POI list in **continuous bidirectional sync** with
the configured TRIP account. The TRIP account is effectively the second replica
of the same data: places created/edited/deleted on either side converge.

### TRIP client

- **Auth:** `POST /api/auth/login` with the stored `trip_username`/`trip_password`
  → access + refresh JWT, held in memory by the backend; access token refreshed
  via `POST /api/auth/refresh`, full re-login on `401`. "Test connection" in
  settings verifies the login and lists TRIP categories.
- **Endpoints used:** `GET /api/places` (list — returns this account's places),
  `POST /api/places` (create), `PUT /api/places/{id}` (update),
  `DELETE /api/places/{id}` (delete), plus `GET /api/categories`.
- **Category mapping:** each MinimalPOI category stores `trip_category_name`
  (TRIP requires an existing, case-sensitive category). Inbound places whose
  TRIP category has no mapping are assigned to a configurable default category;
  outbound POIs whose category isn't mapped surface a fixable error (never a
  silent failure).

### Field mapping (the synced fields)

| MinimalPOI            | TRIP field    |
|-----------------------|---------------|
| name                  | `name`        |
| lat / lng             | `lat` / `lng` |
| address               | `place` (required string) |
| category → trip_category_name | `category` (name) |
| image_url             | `image` (URL) |
| notes                 | `description` |
| website, phone, email | `links` (array; phone/email as `tel:` / `mailto:`) |

Only these fields participate in sync. **Tags, comments, visits, wishlist, and
ratings are MinimalPOI-only** and are never sent to TRIP nor overwritten by an
inbound update. TRIP-only fields (price, duration, favorite, etc.) are left
untouched on update (we `PUT` only the mapped fields).

### Identity & change detection

- A POI is linked to its TRIP place by **`trip_place_id`**.
- **Local edits** are detected by `updated_at` advancing past `trip_synced_at`.
- **TRIP edits** are detected by **snapshot diff**: TRIP exposes no modified
  timestamp, so on each poll we compare the place's current mapped fields to
  `trip_synced_snapshot` (the values stored at the last successful sync). A
  difference means TRIP changed.
- After any successful sync of a POI, `trip_synced_snapshot` and
  `trip_synced_at` are rewritten to the just-synced values — this is what
  **prevents feedback loops** (our own write is never seen as a remote change).

### Sync engine (background worker + on-change)

A single background worker runs every `trip_sync_interval_seconds` (default
5 min); local saves/deletes also enqueue an **immediate** outbound sync so the
common case feels instant. One reconcile pass:

1. **Pull** `GET /api/places` into a snapshot keyed by `trip_place_id`.
2. For each TRIP place **not** linked locally and **not** tombstoned → **import**
   (create a local POI, mapping fields + category; `created_by` = the sync
   system user).
3. For each local POI with no `trip_place_id` and not tombstoned → **create** in
   TRIP (`POST`), store the returned id.
4. For each **linked** POI, classify with the two flags
   (local-changed, trip-changed):
   - neither → nothing.
   - local only → `PUT` to TRIP.
   - TRIP only → update the local POI (mapped fields only).
   - **both → conflict**, resolved per `trip_conflict_policy`:
     `minimalpoi_wins` (PUT local over TRIP), `trip_wins` (overwrite local), or
     `manual` (default) → mark `trip_sync_status = conflict`, change neither
     side, and surface it in the UI for the user to choose per place.
5. **Deletions:** a place deleted locally writes a `local` tombstone → `DELETE`
   in TRIP. A linked place absent from the TRIP pull writes a `trip` tombstone →
   delete locally. Tombstones stop either side from re-creating it from a stale
   read; they can be cleared once both sides confirm absence.

Per-POI `trip_sync_status` (`local_only`/`pending`/`synced`/`conflict`/`error`)
and `trip_last_error` are shown as badges. Failures (TRIP down, unmapped
category, auth) never block local use; the POI stays usable and retries next
pass. A manual **"Sync now"** triggers an immediate pass; settings show last
sync time and any errors.

### Bootstrapping & safety

- First enable does a full reconcile. To avoid accidental mass-duplication when
  both sides already hold the same places, the initial pass runs the same
  **duplicate detection** as §5 (match by name + proximity) and **links**
  matches instead of creating new ones (the user reviews proposed links before
  the first sync commits).
- All sync mutations are logged; a dry-run summary is available before the first
  reconcile.

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
  category filter, visited filter, wishlist filter, "N places shown" — beside a
  MapLibre map with colored category pins and "Fit map to results".
- **Add:** a prominent "Paste a link" input (Google Maps / TripAdvisor /
  website) that enriches and opens the **place editor**; plus "Add manually".
- **Place editor (modal):** Name, Address, Latitude, Longitude, Category, Tags,
  Notes, Phone, Email, Website, image preview. Coordinates can be set/fixed by
  **clicking the map** (the reference "Waypoint"); the image can be **uploaded**
  ("Choose file") to override the enriched one. Actions: Save, Delete, mark
  **Visited** (with team/solo) and set a 1–5 **rating**, toggle **want-to-go**,
  and a **TRIP sync badge** (synced / pending / conflict / error). When a POI is
  in `conflict`, the editor shows both sides' values side by side with "keep
  mine" / "take TRIP" actions. A **comments** section shows attributed notes from
  all users with an add-comment box.
- **Categories:** manage name + color + TRIP-category mapping.
- **Teams:** create teams and manage members.
- **Settings / Admin** (admin only): base map tile URL, map defaults, TRIP
  connection (URL + username/password, "Test connection", sync enable +
  interval, conflict policy, "Sync now", last-sync status and a conflicts list),
  optional Google API key, user management (create/disable accounts),
  GeoJSON import/export ("Bulk import or export your places"), and **full
  backup/restore** (JSON of all data).
- **User settings** (any user): preferred visit context (team or solo), password.
- **Theme:** "Light / minimal" — indigo `#4f46e5` on warm-grays
  (`#f1f0ee` / `#46413a` / `#9a958f`), category accent colors (amber/purple/
  green/blue), fonts **Manrope** (UI) + **JetBrains Mono** (mono), all bundled.

## 9. Auth & multi-user

- Username/password login; session via signed **JWT in an httpOnly cookie**.
- **First run:** when no users exist, the app shows a one-time **setup screen**
  to create the first **admin** account (username + password) in the UI — no
  env-provided credentials. Once an admin exists, the setup screen is disabled
  and visiting it redirects to login.
- There is no self-registration — all other accounts are created by an admin in
  user management (and can be disabled).
- **Shared data:** all authenticated users see and edit the one shared POI list,
  categories, and teams. `created_by` is recorded for attribution.
- **Roles:** `member` (manage POIs/categories/teams, mark visited, comment,
  resolve conflicts) and `admin` (everything + settings, TRIP sync config, user
  management). Inbound (TRIP-created) POIs are attributed to a reserved **sync
  system user** so attribution stays meaningful.

## 10. Deployment

- `docker-compose.yml` with one service and a single volume for `data/`
  (SQLite + `images/`). **No environment variables required** — just map a
  volume and run.
  - The **JWT signing key** is auto-generated on first boot and persisted to
    `data/secret.key` (created with strict file permissions), then reused on
    every subsequent start so existing sessions survive restarts. An optional
    `SECRET_KEY` env var, if set, overrides the file (for users who prefer to
    manage it externally).
  - The first admin is created via the in-app setup screen.
  - Runtime config (TRIP URL/credentials, sync settings, Google key, tile URL,
    map defaults) is editable in-app by an admin. The TRIP password is encrypted
    at rest with the app secret.
- Frontend is built at image-build time and served as static files by FastAPI.
- **Backup/restore:** a full JSON export of all data (POIs, categories, teams,
  visits, wishlist, comments, settings) and a matching import to rebuild a fresh
  instance. Image files are included/referenced so a restore is complete.

## 11. Testing

- **Backend:**
  - Enrichment parsers against **saved HTML fixtures** (Google Maps URL coord
    extraction, TripAdvisor + generic OpenGraph/JSON-LD).
  - TRIP client against a **mocked TRIP API**: login + token refresh + re-login
    on 401, and field-mapping unit tests.
  - **Sync engine** against the mock — the matrix that matters most:
    local-only create → POST; TRIP-only create → import; local edit → PUT;
    TRIP edit (snapshot diff) → local update; both edited → conflict per each
    policy; local delete → DELETE + tombstone; TRIP delete → local delete +
    tombstone; **no feedback loop** (our own write isn't re-detected); unmapped
    category and TRIP-down → error + retry, no data loss; initial reconcile
    links duplicates instead of doubling them.
  - Duplicate detection (source-url and name+proximity matches).
  - First-run setup (create first admin; setup disabled once an admin exists),
    auth/roles, admin-only account creation, POI/Visit/Wishlist/Comment/Team
    CRUD, GeoJSON import/export, and full backup/restore round-trip.
- **Frontend:** component tests for the place editor, enrich flow, map-pick
  coordinates, image upload, visited+rating, wishlist toggle, comments, and the
  conflict-resolution view, with a mocked API.

## 12. Open items / future

- Optional: sync more fields if TRIP later exposes a modified timestamp (would
  let us replace snapshot-diff with cheaper timestamp comparison).
- Optional: map MinimalPOI-only concepts onto TRIP's extra fields (visited →
  TRIP `visited`, rating → none) — deferred to keep the sync surface small.
- Optional self-hosted tile server / offline basemap (config already supports a
  custom tile URL).
- **Conflict policy default is `manual`** (surface conflicts, change nothing
  automatically). Confirm during spec review if you'd prefer `minimalpoi_wins`
  as the default instead.
