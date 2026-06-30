# Changelog

## [1.2.2](https://github.com/Bardesss/minimalpoi/compare/v1.2.1...v1.2.2) (2026-06-30)


### Bug Fixes

* **mobile:** pin sheet footer to bottom and keep sort controls on one row ([b6eb9ee](https://github.com/Bardesss/minimalpoi/commit/b6eb9ee9417fa6a24674e0adf20489ca152eef4c))
* **mobile:** pin sheet footer to bottom and keep sort controls on one row ([7bfc345](https://github.com/Bardesss/minimalpoi/commit/7bfc345165d2baab8d8f29c2975d648be8098540))

## [1.2.1](https://github.com/Bardesss/minimalpoi/compare/v1.2.0...v1.2.1) (2026-06-30)


### Bug Fixes

* **map:** pins intermittently disappear on refresh (load-race) ([e855c69](https://github.com/Bardesss/minimalpoi/commit/e855c69957f4d5a11e40a3e50bad903eb82abbf3))
* **map:** seed pin source with latest data when query wins the load race ([5157c0f](https://github.com/Bardesss/minimalpoi/commit/5157c0f73622bc4628393a4ca377fac01f3d160a))

## [1.2.0](https://github.com/Bardesss/minimalpoi/compare/v1.1.0...v1.2.0) (2026-06-30)


### Features

* **list:** merge visited + sort + view into ListToolbar ([82c1c81](https://github.com/Bardesss/minimalpoi/commit/82c1c817bac5dbe394a8ca6d271545e3b6e1fd45))
* **list:** sort places + consolidated list toolbar ([8165e78](https://github.com/Bardesss/minimalpoi/commit/8165e782f7e9f92aef280390d86aeb963a417893))
* **list:** use ListToolbar in sidebar, drop FilterBar row ([b822d02](https://github.com/Bardesss/minimalpoi/commit/b822d023e63298cb2397cf240cfced690998edbe))

## [1.1.0](https://github.com/Bardesss/minimalpoi/compare/v1.0.3...v1.1.0) (2026-06-29)


### Features

* **list:** sort places (recently added, name, top rated, nearest) ([1e2312c](https://github.com/Bardesss/minimalpoi/commit/1e2312c482dd0fbcc3d9bc7e588757fd883de07b))
* **list:** sort the place list (recent, name, top rated, nearest) ([f513357](https://github.com/Bardesss/minimalpoi/commit/f513357de7ed6bd32d5b23d6f86fedc13a5f88cf))

## [1.0.3](https://github.com/Bardesss/minimalpoi/compare/v1.0.2...v1.0.3) (2026-06-29)


### Bug Fixes

* **ui:** form layout, flag country picker, list scroll, review-draft reset ([5d50790](https://github.com/Bardesss/minimalpoi/commit/5d507901fc34fbff5304a2b6c5209256cc9301e6))
* **ui:** place-form layout, flag country picker, list scroll, review reset ([97a14b0](https://github.com/Bardesss/minimalpoi/commit/97a14b07058c04623617f2abd14a58a179ec4b36))

## [1.0.2](https://github.com/Bardesss/minimalpoi/compare/v1.0.1...v1.0.2) (2026-06-29)


### Bug Fixes

* **ratelimit:** drop headers_enabled — it 500'd every limited endpoint ([94a6057](https://github.com/Bardesss/minimalpoi/commit/94a60570f7e3d60d9d164dff374596c64e9290ca))
* **ratelimit:** drop headers_enabled that 500'd search/writes (fixes 1.0.x) ([7f1d465](https://github.com/Bardesss/minimalpoi/commit/7f1d465143a09149ce33e2372345e43b29910b3e))

## [1.0.1](https://github.com/Bardesss/minimalpoi/compare/v1.0.0...v1.0.1) (2026-06-29)


### Bug Fixes

* **docker:** honor PUID/PGID + auto-fix /data ownership (fixes v1.0.0 login 500) ([dc12142](https://github.com/Bardesss/minimalpoi/commit/dc12142d8fa688e7b769604a98d5ff1e2d947996))
* **docker:** honor PUID/PGID and auto-fix /data ownership on startup ([216cc4f](https://github.com/Bardesss/minimalpoi/commit/216cc4fe8e927939b26f2169496b78888edcc4e0))

## [1.0.0](https://github.com/Bardesss/minimalpoi/compare/v0.25.0...v1.0.0) (2026-06-29)


### Features

* **security:** add rate limiting (slowapi) ([682cb10](https://github.com/Bardesss/minimalpoi/commit/682cb10ce3a6927661f240c9c4b3618c777c16a2))
* **security:** authz hardening (owners, sessions, cookies, settings) ([f9810de](https://github.com/Bardesss/minimalpoi/commit/f9810de8bb3634555f1b3384347965899ef57e90))


### Bug Fixes

* **api:** consistency — 404s, response models, typed enums, cache, dead code ([2370abe](https://github.com/Bardesss/minimalpoi/commit/2370abe65209d28c154a4e49ed080332f940b3ee))
* **backend:** correctness landmines (restore, dedup, sync, migrations) ([ca62d4e](https://github.com/Bardesss/minimalpoi/commit/ca62d4e35f75f34889b91f25a2c7cff30e9ff7e3))
* **infra:** valid compose, non-root container, healthcheck ([103b2fd](https://github.com/Bardesss/minimalpoi/commit/103b2fd7d74799d656ee973e3a1f6c3500b9167d))
* **security:** bound fetch/upload sizes, sanitize restore, guard SSRF ([dfb2c36](https://github.com/Bardesss/minimalpoi/commit/dfb2c36b223b095f057f22433a9fcccf2ccf41ff))


### Miscellaneous Chores

* release 1.0.0 ([13d5f52](https://github.com/Bardesss/minimalpoi/commit/13d5f526c81680a979d2ce66b0ad1f63d1427330))

## [0.25.0](https://github.com/Bardesss/minimalpoi/compare/v0.24.0...v0.25.0) (2026-06-29)


### Features

* **ui:** map view toggle, mobile sheet scroll fix, unified reviews ([2988325](https://github.com/Bardesss/minimalpoi/commit/29883257dd3a93a6d5eddec43c1f47f71c0c535e))
* **ui:** map view toggle, mobile sheet scroll fix, unified reviews ([98cadda](https://github.com/Bardesss/minimalpoi/commit/98caddac7db2affc461d339d46c724aaa490ade3))

## [0.24.0](https://github.com/Bardesss/minimalpoi/compare/v0.23.0...v0.24.0) (2026-06-29)


### Features

* **mobile:** top-left add button + full-screen detail overlay ([b762781](https://github.com/Bardesss/minimalpoi/commit/b762781025e98bdf8f63d3351b2faa69f0d4ee11))
* **mobile:** top-left add button + full-screen detail overlay ([0826fc3](https://github.com/Bardesss/minimalpoi/commit/0826fc3c8ad0a01c0a4ccd9ab739af257f9c7eeb))

## [0.23.0](https://github.com/Bardesss/minimalpoi/compare/v0.22.0...v0.23.0) (2026-06-29)


### Features

* **search:** city & country matching, accent-folding, typo tolerance ([8a120d9](https://github.com/Bardesss/minimalpoi/commit/8a120d96225701880b10a7c192ed8411e4948a1d))
* **search:** match city & country, fold accents, tolerate typos ([59e5b7d](https://github.com/Bardesss/minimalpoi/commit/59e5b7deeb6d8fea243133a1ee88aad82be63ca6))

## [0.22.0](https://github.com/Bardesss/minimalpoi/compare/v0.21.0...v0.22.0) (2026-06-29)


### Features

* **comments:** edit your own comment text inline ([2c87d2a](https://github.com/Bardesss/minimalpoi/commit/2c87d2a6d1e1927c2a7b5f5fa67a60fedaea822e))
* **comments:** edit your own comment text inline ([c6f2d8b](https://github.com/Bardesss/minimalpoi/commit/c6f2d8bed1905b159fa22efa7ebd657129105c01))

## [0.21.0](https://github.com/Bardesss/minimalpoi/compare/v0.20.0...v0.21.0) (2026-06-29)


### Features

* **visits:** merge the visit editor into the comments thread ([3fd4060](https://github.com/Bardesss/minimalpoi/commit/3fd4060f8e8cfd18e94ddfca545785123ac9f7fd))
* **visits:** merge visit editor into comments + smaller visited marker ([604cd56](https://github.com/Bardesss/minimalpoi/commit/604cd56ff37247ae6e43e5806abb994d0f0957c7))

## [0.20.0](https://github.com/Bardesss/minimalpoi/compare/v0.19.0...v0.20.0) (2026-06-29)


### Features

* **backup:** full ZIP backup & restore of all data (admin) ([5152641](https://github.com/Bardesss/minimalpoi/commit/51526419cdf01d5d5e01b35aa2cd623ec554f15e))
* **backup:** full ZIP backup & restore of all data, admin (Phase 6 Slice 3) ([5676ffc](https://github.com/Bardesss/minimalpoi/commit/5676ffcc942b3284c5c1a6f67084ab0b77e933b3))

## [0.19.0](https://github.com/Bardesss/minimalpoi/compare/v0.18.1...v0.19.0) (2026-06-29)


### Features

* **editor:** manual photo upload + fix edit-mode image drop (Phase 6 Slice 2) ([478c595](https://github.com/Bardesss/minimalpoi/commit/478c5956b310f5742095a28e2230f3d5b44d5642))
* **editor:** upload a photo from your device + fix edit dropping the image ([4f73661](https://github.com/Bardesss/minimalpoi/commit/4f73661f6245acd1a922fd7165ec7d78d5ca9a45))

## [0.18.1](https://github.com/Bardesss/minimalpoi/compare/v0.18.0...v0.18.1) (2026-06-29)


### Bug Fixes

* **ci:** run frontend tests serially + de-flake MapSection test ([bd82200](https://github.com/Bardesss/minimalpoi/commit/bd822001f4b29ba332875d8e2a7f4fa5f6cf5fa4))
* **ci:** run frontend tests serially + de-flake MapSection test ([4b988c7](https://github.com/Bardesss/minimalpoi/commit/4b988c74f2ad23892bda022400be76b9274ab9d0))

## [0.18.0](https://github.com/Bardesss/minimalpoi/compare/v0.17.0...v0.18.0) (2026-06-29)


### Features

* **filters:** filter the list/map by places I've visited ([3c9531a](https://github.com/Bardesss/minimalpoi/commit/3c9531ab1e3e306b3ea99b4e669c65476593acb5))
* **filters:** filter the list/map by places I've visited (Phase 6 Slice 1) ([5576a7f](https://github.com/Bardesss/minimalpoi/commit/5576a7f815d0ad35963f9872df22e30d72ca68ca))

## [0.17.0](https://github.com/Bardesss/minimalpoi/compare/v0.16.1...v0.17.0) (2026-06-28)


### Features

* **mobile:** drag the POI detail card down to reveal the map ([260fcea](https://github.com/Bardesss/minimalpoi/commit/260fcea79bd3faf3c23395cb6bd507c638fa1730))
* **mobile:** make the POI detail card draggable to reveal the map ([76f929f](https://github.com/Bardesss/minimalpoi/commit/76f929f61faeb280f2820cc881cfc0efb44a9e25))

## [0.16.1](https://github.com/Bardesss/minimalpoi/compare/v0.16.0...v0.16.1) (2026-06-28)


### Bug Fixes

* **visits:** group rating + comment + save into one card; gold stars ([9257296](https://github.com/Bardesss/minimalpoi/commit/9257296ec70a35ae438b1414e29cd2b7ff71588e))
* **visits:** group rating + comment into one card; gold stars ([869ef3e](https://github.com/Bardesss/minimalpoi/commit/869ef3ef65cee3f079e46dd6ed8171e58ac396a9))

## [0.16.0](https://github.com/Bardesss/minimalpoi/compare/v0.15.0...v0.16.0) (2026-06-28)


### Features

* **visits:** unify rating + comment into one action; show average on cards ([698ee46](https://github.com/Bardesss/minimalpoi/commit/698ee466d1abb53025c7b03e4cf0461b790fce32))
* **visits:** unify rating + comment; show average rating on cards ([4b00651](https://github.com/Bardesss/minimalpoi/commit/4b00651e962aec44b3c7194a9fc6636b92297693))

## [0.15.0](https://github.com/Bardesss/minimalpoi/compare/v0.14.1...v0.15.0) (2026-06-28)


### ⚠ BREAKING CHANGES

* the /api/pois/{id}/wishlist endpoints are removed.

### Features

* remove the wishlist feature ([05eb839](https://github.com/Bardesss/minimalpoi/commit/05eb839e1ea1ed346c1ba7d114d56f68f038f03c))

## [0.14.1](https://github.com/Bardesss/minimalpoi/compare/v0.14.0...v0.14.1) (2026-06-28)


### Bug Fixes

* **mobile:** enlarge bottom-sheet drag target ([ec51155](https://github.com/Bardesss/minimalpoi/commit/ec51155f6fddc8db4f4ea6133740296f5529bc95))
* **mobile:** enlarge bottom-sheet drag target ([b5648ca](https://github.com/Bardesss/minimalpoi/commit/b5648cac1f0e6026692c76e80dea36f26ad482f2))

## [0.14.0](https://github.com/Bardesss/minimalpoi/compare/v0.13.0...v0.14.0) (2026-06-26)


### Features

* **auth:** persistent 30-day sessions; refresh README ([6c394f7](https://github.com/Bardesss/minimalpoi/commit/6c394f767c2d639e197ab84bb89076d1cc247ea7))
* **auth:** persistent 30-day sessions; refresh README ([66f8037](https://github.com/Bardesss/minimalpoi/commit/66f803757f1a64f7c1985dd8d6b4d20873a5c23a))

## [0.13.0](https://github.com/Bardesss/minimalpoi/compare/v0.12.1...v0.13.0) (2026-06-26)


### Features

* **frontend:** responsive mobile layout (map-first bottom sheet) ([fdd3735](https://github.com/Bardesss/minimalpoi/commit/fdd37355b415155ebc3e667ee9ab46f28fa626c9))
* **frontend:** responsive mobile layout (map-first bottom sheet) ([2f264af](https://github.com/Bardesss/minimalpoi/commit/2f264af6638ded25979ca34e19b32eb7636f56e3))


### Bug Fixes

* **test:** guard matchMedia stub for node-env test files ([0109f5c](https://github.com/Bardesss/minimalpoi/commit/0109f5c0f425405de3ab99bb60c9a7e6e4a41a1e))

## [0.12.1](https://github.com/Bardesss/minimalpoi/compare/v0.12.0...v0.12.1) (2026-06-26)


### Bug Fixes

* **docker:** build frontend natively for multi-arch (unblocks image publish) ([413c131](https://github.com/Bardesss/minimalpoi/commit/413c131c966167772ff0b51f64fc342477777d78))
* **docker:** build the frontend on the native platform for multi-arch ([602dcd8](https://github.com/Bardesss/minimalpoi/commit/602dcd8a44cebfe0df3d4ad785e089ab4c009e15))

## [0.12.0](https://github.com/Bardesss/minimalpoi/compare/v0.11.0...v0.12.0) (2026-06-26)


### Features

* **web:** search Google Places to add a POI ([fc23fd3](https://github.com/Bardesss/minimalpoi/commit/fc23fd3c7a58ed038366f2ba8011a4aae829954a))
* **web:** show "&lt;City&gt;, &lt;flag&gt;" on POI cards ([c65aa0f](https://github.com/Bardesss/minimalpoi/commit/c65aa0f4d9bdcbd1d7d27b9eb6db284992f1aa6f))


### Bug Fixes

* **enrich:** decode Google Maps place names from EU consent redirects ([42d25a5](https://github.com/Bardesss/minimalpoi/commit/42d25a51001392180f1b1af6d81f1d44381a7666))

## [0.11.0](https://github.com/Bardesss/minimalpoi/compare/v0.10.1...v0.11.0) (2026-06-26)


### Features

* **web:** worldwide phone input (country picker -&gt; E.164) + formatted display ([3a2bd46](https://github.com/Bardesss/minimalpoi/commit/3a2bd461ae5bc24062d9c63d1dc634a8ddeca5f1))
* **web:** worldwide phone input + formatted display ([922fe45](https://github.com/Bardesss/minimalpoi/commit/922fe458e9a71a600ead04fb54fac5d17413a23a))

## [0.10.1](https://github.com/Bardesss/minimalpoi/compare/v0.10.0...v0.10.1) (2026-06-26)


### Bug Fixes

* **docker:** install phonenumbers so the container starts ([ceb5efd](https://github.com/Bardesss/minimalpoi/commit/ceb5efd77fc3f201742e9435351ebf31067f7ca8))
* **docker:** install phonenumbers so the container starts (v0.10.0 boot crash) ([a31a04f](https://github.com/Bardesss/minimalpoi/commit/a31a04f536513679f6dccd354b43bb91ef9655f4))

## [0.10.0](https://github.com/Bardesss/minimalpoi/compare/v0.9.0...v0.10.0) (2026-06-26)


### Features

* **enrich:** richer Google enrichment (phone, website, photo) ([f844c63](https://github.com/Bardesss/minimalpoi/commit/f844c6303676c8b292be9072a2424ced449c220a))
* **phone:** normalize POI phone numbers to E.164 (worldwide) ([02d069c](https://github.com/Bardesss/minimalpoi/commit/02d069ca698d928528b024f295b887fc2385336d))


### Bug Fixes

* **db:** backfill missing nullable columns on existing databases ([1782c48](https://github.com/Bardesss/minimalpoi/commit/1782c48b499eebda1510137f54c83c3869d1c6cf))
* **users:** hide and protect the reserved __trip_sync__ system account ([df55074](https://github.com/Bardesss/minimalpoi/commit/df550740011a704109ed572ac321b85f0dbf1cbe))
* **web:** serve dist-root static files (favicon.svg) instead of index.html ([50f8b73](https://github.com/Bardesss/minimalpoi/commit/50f8b73be7ca9380df64c137b46b03c714e88966))

## [0.9.0](https://github.com/Bardesss/minimalpoi/compare/v0.8.0...v0.9.0) (2026-06-26)


### Features

* **web:** show visited/wishlist/comments on the DetailPanel ([c49d111](https://github.com/Bardesss/minimalpoi/commit/c49d11156b26296f2162425b36238d10460b4dce))

## [0.8.0](https://github.com/Bardesss/minimalpoi/compare/v0.7.1...v0.8.0) (2026-06-26)


### Features

* **sync:** last-run stamp + conflict list/resolve API (slice 3 backend) ([1c0aefb](https://github.com/Bardesss/minimalpoi/commit/1c0aefb521d6d76cdfc7fc4a46f50b34e4eac2c8))
* **web:** admin Sync section — status, Sync now, per-item conflict resolve ([d14a4f7](https://github.com/Bardesss/minimalpoi/commit/d14a4f7fd1737dd0abe60c129c9b526f750b7a9f))
* **web:** data layer for sync status, conflicts, resolve, sync-now ([246048a](https://github.com/Bardesss/minimalpoi/commit/246048a6c8eee3a248ac27491c82fe39a7792448))

## [0.7.1](https://github.com/Bardesss/minimalpoi/compare/v0.7.0...v0.7.1) (2026-06-26)


### Bug Fixes

* **4c-followups:** cap import upload size; defer object-URL revoke ([311d43e](https://github.com/Bardesss/minimalpoi/commit/311d43e7a2a766183386ad96302e7030f4642c5f))
* **4c:** cap import upload size; defer object-URL revoke ([8126060](https://github.com/Bardesss/minimalpoi/commit/812606068b1ddb928ce70afdbd96aa6c6cb0eba7))

## [0.7.0](https://github.com/Bardesss/minimalpoi/compare/v0.6.0...v0.7.0) (2026-06-25)


### Features

* **teams:** GET /api/teams/candidates (id+username, any user) ([d06bafe](https://github.com/Bardesss/minimalpoi/commit/d06bafea236f8373cac691c7bd4210f704fde6cd))
* **web:** add 'View on GitHub' link to the About settings tab ([fba67b1](https://github.com/Bardesss/minimalpoi/commit/fba67b1330df9747e9f22976443d184d3d24883f))
* **web:** data layer for users, teams, preferred team ([5292113](https://github.com/Bardesss/minimalpoi/commit/529211320eeb05624adae432389995095b2a1f61))
* **web:** manage teams + preferred-team selector in Settings (with toast feedback) ([f736d86](https://github.com/Bardesss/minimalpoi/commit/f736d86b6746012436dd20fcc457b89be9cac8fd))
* **web:** manage users (create/role/disable/delete) in Settings with toast feedback ([0d5d83f](https://github.com/Bardesss/minimalpoi/commit/0d5d83fdef9a1cedb033df3396327784aa490a76))


### Bug Fixes

* **web:** new team auto-includes its creator as a member ([7018214](https://github.com/Bardesss/minimalpoi/commit/70182144bffa04ea79eabaac3bc6afbdb7e33728))

## [0.6.0](https://github.com/Bardesss/minimalpoi/compare/v0.5.1...v0.6.0) (2026-06-25)


### Features

* **web:** toast feedback on settings save actions ([e20bf87](https://github.com/Bardesss/minimalpoi/commit/e20bf8754a09068bcc5a58c8dc2cba86cd9e5200))
* **web:** toast feedback on settings save actions ([5f2923e](https://github.com/Bardesss/minimalpoi/commit/5f2923e5299b5c3e6db928f8fe3ca876a7e45b79))

## [0.5.1](https://github.com/Bardesss/minimalpoi/compare/v0.5.0...v0.5.1) (2026-06-25)


### Bug Fixes

* **sync:** stop category deletes cascading to TRIP; guard empty pulls ([63312af](https://github.com/Bardesss/minimalpoi/commit/63312af1da733afa24ecf7bd18807c29724a291b))
* **sync:** stop category deletes cascading to TRIP; guard empty pulls ([5cbc5c7](https://github.com/Bardesss/minimalpoi/commit/5cbc5c750ca9844a0038c694809b9c74f8f1364d))

## [0.5.0](https://github.com/Bardesss/minimalpoi/compare/v0.4.1...v0.5.0) (2026-06-25)


### Features

* **tags:** list/rename/delete tags API ([daf4723](https://github.com/Bardesss/minimalpoi/commit/daf4723833ede3c8bd638cb8fbb36d15dc346f22))
* **version:** /api/version with GitHub update check; bake version into image ([6a50b55](https://github.com/Bardesss/minimalpoi/commit/6a50b5576ba42b569d5a61943ceb78ceed2b42a5))
* **web:** About section with version + update-available indicator ([34cbef8](https://github.com/Bardesss/minimalpoi/commit/34cbef82d802545d308b64dd623453b8d841494d))
* **web:** admin Connections + Map settings sections with member gating ([6385563](https://github.com/Bardesss/minimalpoi/commit/638556342f5d5a36f0f1596fada6da9df2eb835f))
* **web:** brand-matched MapPin favicon ([de2fc3f](https://github.com/Bardesss/minimalpoi/commit/de2fc3f59eda993b5c7dbbb192d3b42673380f0f))
* **web:** data layer for full settings, category CRUD, tags ([4dbbb1a](https://github.com/Bardesss/minimalpoi/commit/4dbbb1a4f8b68655caa69d3602018e6b594ec987))
* **web:** manage categories (color + icon) in Settings ([dae061b](https://github.com/Bardesss/minimalpoi/commit/dae061bd17f8141b2b1d96030981a6e2399ab6fc))
* **web:** manage tags (rename/merge/delete) in Settings ([0062418](https://github.com/Bardesss/minimalpoi/commit/0062418f1ae89d32103a6b1ebac14b6c4dd2c7d8))
* **web:** MapPin brand logo ([22a5f35](https://github.com/Bardesss/minimalpoi/commit/22a5f35ce43ced47964997abe03c18fcd3d92cdd))
* **web:** unified Settings modal with Data & backups section ([6bda9aa](https://github.com/Bardesss/minimalpoi/commit/6bda9aac3bffa777831b988322158aaf062c58e8))


### Bug Fixes

* **version:** fail-silent on non-dict JSON + throttle update check to TTL on failure ([6e451eb](https://github.com/Bardesss/minimalpoi/commit/6e451eb89b5ffff9d879b74f6e6d9febfdf121aa))
* **web:** MapSection omits cleared numeric fields; guard empty Settings nav ([94aee2f](https://github.com/Bardesss/minimalpoi/commit/94aee2f694339a687914608e62c7b01672adcf08))

## [0.4.1](https://github.com/Bardesss/minimalpoi/compare/v0.4.0...v0.4.1) (2026-06-25)


### Bug Fixes

* **web:** don't bounce authenticated user back to /setup ([efa77ce](https://github.com/Bardesss/minimalpoi/commit/efa77ce7b89493fd4c7a71adcf2340b3bc43b069))
* **web:** don't redirect authenticated user back to /setup ([a47d2ba](https://github.com/Bardesss/minimalpoi/commit/a47d2ba0258a043d498d8db0f466dfec3038e222))

## [0.4.0](https://github.com/Bardesss/minimalpoi/compare/v0.3.0...v0.4.0) (2026-06-25)


### Features

* **images:** add Pillow process_image (WebP, resize, validate) ([030c3a7](https://github.com/Bardesss/minimalpoi/commit/030c3a7f5fca5edeaab293327440d72fb47f85a0))
* **images:** compress + resize to WebP on save ([e001767](https://github.com/Bardesss/minimalpoi/commit/e001767e4d930967debb98ea3a4f7c6d070d5790))
* **images:** process + validate uploads, 415 on unsupported ([ae6805c](https://github.com/Bardesss/minimalpoi/commit/ae6805c03b220bb1893029151e9580cf2b8cf149))
* **images:** process enriched images to WebP, keep remote URL on reject ([334592e](https://github.com/Bardesss/minimalpoi/commit/334592e9d9626bafb3dc2c06680fe8cae0dc60a1))


### Bug Fixes

* **images:** bound decode size (pixel-dimension guard + upload byte cap) ([3e7f415](https://github.com/Bardesss/minimalpoi/commit/3e7f415098a9be59b3dc891059e3b8affe648673))

## [0.3.0](https://github.com/Bardesss/minimalpoi/compare/v0.2.0...v0.3.0) (2026-06-25)


### Features

* **api:** default map_tile_url to Carto voyager style.json ([1b51274](https://github.com/Bardesss/minimalpoi/commit/1b51274533ff0d9881db0f19df9131498c7df7f5))
* **backend:** admin user management ([ab74ea0](https://github.com/Bardesss/minimalpoi/commit/ab74ea02f43f3ded2634a1a10c6a3b279dbd175f))
* **backend:** auth dependencies + test client fixture ([b360cf7](https://github.com/Bardesss/minimalpoi/commit/b360cf77fc796be0e9ad8afb7a6e0a728f3d51c4))
* **backend:** categories CRUD with lucide icon + TRIP sync-state fields ([6de6786](https://github.com/Bardesss/minimalpoi/commit/6de67866cd1a2c6a9498a12e8ce4411256b357bb))
* **backend:** db engine/session + User model ([9708e7b](https://github.com/Bardesss/minimalpoi/commit/9708e7b244e482a7889583d2283fdac2d32e054b))
* **backend:** first-run setup, login/logout, me ([741a13c](https://github.com/Bardesss/minimalpoi/commit/741a13c50b4b5f83a5ae93901bd04ff9659c01c4))
* **backend:** password hashing + JWT helpers ([015707e](https://github.com/Bardesss/minimalpoi/commit/015707e7cae74dc18759a144b1ff7c9a58354659))
* **backend:** per-user comment threads ([d9a06e1](https://github.com/Bardesss/minimalpoi/commit/d9a06e14581db5fae30d4dc7c6a6f7c79bd47689))
* **backend:** per-user visits with team+rating and preferred team ([83dbd78](https://github.com/Bardesss/minimalpoi/commit/83dbd78e571782337700d9781c724993df71976e))
* **backend:** per-user wishlist ([1b699ca](https://github.com/Bardesss/minimalpoi/commit/1b699ca9f1dc50e7c0340acd1e2c9dacdc38ffb5))
* **backend:** POI CRUD + duplicate detection + delete tombstones ([4007457](https://github.com/Bardesss/minimalpoi/commit/4007457c2f87dc807ce8f329e61a09a76845cf95))
* **backend:** scaffold app, config, secret bootstrap, crypto ([baf9cfb](https://github.com/Bardesss/minimalpoi/commit/baf9cfb3c2c2330cecc4863d384f691650665c89))
* **backend:** settings singleton with encrypted TRIP credentials ([7e3a6f6](https://github.com/Bardesss/minimalpoi/commit/7e3a6f62e8bcfcf987478fdd40ffb263274607d6))
* **backend:** teams CRUD ([59ab97d](https://github.com/Bardesss/minimalpoi/commit/59ab97d5d5c32fb2519a3c40faaeaa23bc4374ff))
* **docker:** single-process Dockerfile + compose + .dockerignore; robust SPA test ([7ada23b](https://github.com/Bardesss/minimalpoi/commit/7ada23bb36eb2db6351140ea65433560452c28e2))
* **enrich:** async fetch_url with httpx (runtime dep) ([8bbc542](https://github.com/Bardesss/minimalpoi/commit/8bbc542f97e20d7818fbcebd5bf9881f13ba97bd))
* **enrich:** google maps detection, coords, shortlink, places lookup ([065f529](https://github.com/Bardesss/minimalpoi/commit/065f529524eea5e8768e64bbbe46a0506b68defc))
* **enrich:** image localization, upload endpoint, static serving ([ddb3f29](https://github.com/Bardesss/minimalpoi/commit/ddb3f2973106634c57a7e2b757cd7da22d520d19))
* **enrich:** nominatim geocoding fallback ([4483f9a](https://github.com/Bardesss/minimalpoi/commit/4483f9af37d387839d3274c5f202dc52c8599090))
* **enrich:** OpenGraph + JSON-LD parsers (stdlib) ([723bab7](https://github.com/Bardesss/minimalpoi/commit/723bab7226cc639404f83f4b4c095b8fbfcf39e1))
* **enrich:** orchestration service with provenance ([8ccc4bd](https://github.com/Bardesss/minimalpoi/commit/8ccc4bd24e5e2760469c8b7898c0e41812dca9c5))
* **enrich:** parse Twitter Card + OG/Place geo, broaden JSON-LD types ([cfa8374](https://github.com/Bardesss/minimalpoi/commit/cfa8374ff8e4048fc828595dc2041c9113a10b20))
* **enrich:** POST /api/enrich endpoint ([ae7a377](https://github.com/Bardesss/minimalpoi/commit/ae7a3777971648232db5ebb906851db3ea7a291a))
* **enrich:** Twitter + OG/Place-geo fallbacks with first-wins precedence ([df608cc](https://github.com/Bardesss/minimalpoi/commit/df608cc171fbbfe6dd02bcfed0227854822335e4))
* **pois:** import (GeoJSON/CSV) + export (GeoJSON) endpoints ([1eae0cf](https://github.com/Bardesss/minimalpoi/commit/1eae0cfe336c240f7eb1fb5545d421e087b7910e))
* **portability:** pure GeoJSON/CSV parse + GeoJSON serialize ([7a6db73](https://github.com/Bardesss/minimalpoi/commit/7a6db73b0742e46b7336e378757e993891533302))
* **trip:** authenticated TRIP client (login/relogin) ([c967c64](https://github.com/Bardesss/minimalpoi/commit/c967c64c4eb66f110a4305ca9385cd97b06a97cd))
* **trip:** category reconcile (create/import) + sync system user ([ad163f6](https://github.com/Bardesss/minimalpoi/commit/ad163f62a579fdcd43037066965205c433869ea8))
* **trip:** comparable snapshots + change detection ([7ae04c7](https://github.com/Bardesss/minimalpoi/commit/7ae04c7e62277df761f1bc8ba675bdd887f4365e))
* **trip:** deletion propagation (both ways) + conflict policies ([314a542](https://github.com/Bardesss/minimalpoi/commit/314a54236c0c53f6c538eb87fef5549c312aa351))
* **trip:** initial reconcile links duplicates instead of doubling ([a224d53](https://github.com/Bardesss/minimalpoi/commit/a224d537a0b7208b1c9f29bf9a2ac481bb6a8bc9))
* **trip:** place reconcile (import/create/update/inbound) ([ab4eaff](https://github.com/Bardesss/minimalpoi/commit/ab4eaff33c98b54934623c7b0e111aa96957b6df))
* **trip:** places + categories CRUD on TripClient ([40e46d1](https://github.com/Bardesss/minimalpoi/commit/40e46d1eda38cca2bd87e16b44adb3b422461be5))
* **trip:** pure field mapping POI&lt;-&gt;TRIP ([48260e5](https://github.com/Bardesss/minimalpoi/commit/48260e514013c64a1abeb00d9a3bd219bad3c21c))
* **trip:** sync service, /api/sync endpoints, background worker ([ee9b664](https://github.com/Bardesss/minimalpoi/commit/ee9b664c31d017bfe7ad2314cfdb6a40661c6eea))
* **ui:** add design-token theme module and tint derivation ([c61f414](https://github.com/Bardesss/minimalpoi/commit/c61f4144934c6bac6935a8936705c202aa1007b2))
* **ui:** add FAB and add/edit POI form modal with duplicate warning ([9a633c2](https://github.com/Bardesss/minimalpoi/commit/9a633c24d9d63d131299681ed15bed2f59572a31))
* **ui:** AppShell + sidebar wired to live POI/category data ([fff8cb8](https://github.com/Bardesss/minimalpoi/commit/fff8cb84a466eae5ee2dc6918cf50595ca014c58))
* **ui:** auth API functions with MSW test harness ([485e819](https://github.com/Bardesss/minimalpoi/commit/485e819e65041f46bb0b9793b4ff7a166a274921))
* **ui:** auth context bootstrapped from /api/auth/me ([dba43f0](https://github.com/Bardesss/minimalpoi/commit/dba43f0fb8fa2eddcfcbed809ca8e4f425158884))
* **ui:** global CSS with self-hosted fonts, scrollbar, keyframes ([dec3e29](https://github.com/Bardesss/minimalpoi/commit/dec3e29dd7c617535b5e3e1f44d392bbaa57a45c))
* **ui:** lucide category-icon resolver with fallback ([e8aaf4a](https://github.com/Bardesss/minimalpoi/commit/e8aaf4a4c03a06f83389a50863bed3bc808de64a))
* **ui:** MapView with clustered, category-colored POI layers ([2c46fbd](https://github.com/Bardesss/minimalpoi/commit/2c46fbd256ffdf7f719cee9b91f7c0060628ea18))
* **ui:** mount map, legend, expand button; wire select/fly/fit ([2d1617b](https://github.com/Bardesss/minimalpoi/commit/2d1617ba692776c12ee29e2833360b615f02b0ab))
* **ui:** POI detail panel with edit and two-step delete ([0036e22](https://github.com/Bardesss/minimalpoi/commit/0036e22108fddd9cb7127a2f35702154695acb36))
* **ui:** pure map helpers (features, colors, bounds, style resolve) ([911134f](https://github.com/Bardesss/minimalpoi/commit/911134fcd873c266d6b81beecba996149c55bd89))
* **ui:** react-query provider, data/mutation hooks, test harness ([5a381ec](https://github.com/Bardesss/minimalpoi/commit/5a381ec28a47e598f8e26a818200fdf05d5d8164))
* **ui:** restyle login page onto design system ([b53178c](https://github.com/Bardesss/minimalpoi/commit/b53178c1351986d8423fb5f967123edd0387b19b))
* **ui:** restyle setup page onto design system ([6a872ce](https://github.com/Bardesss/minimalpoi/commit/6a872cecdabefd8727300669e9cb82b2aca34617))
* **ui:** scaffold Vite + React + TS app with dev proxy and test harness ([94ce672](https://github.com/Bardesss/minimalpoi/commit/94ce67298b69e5bac9f558ec23e12c149f29293e))
* **ui:** serve built SPA from FastAPI with API/image precedence ([bc246fc](https://github.com/Bardesss/minimalpoi/commit/bc246fc06ed53594887a109c8653967b848096ed))
* **ui:** setup/login/logout flow with guarded routes ([80f27e7](https://github.com/Bardesss/minimalpoi/commit/80f27e7372bb9d6e5cc916d64b14ed56f935e316))
* **ui:** sidebar header, account footer, POI card and list ([c935ebe](https://github.com/Bardesss/minimalpoi/commit/c935ebe35cd3e22f44c1ac31626f98f8e0a6bacc))
* **ui:** typed apiFetch client with ApiError and credentials ([9937d23](https://github.com/Bardesss/minimalpoi/commit/9937d233734f9598c9c3899fa8159d0edf212b59))
* **ui:** typed POI/category/settings API fetchers ([4b87f3b](https://github.com/Bardesss/minimalpoi/commit/4b87f3b9b3f6169ba5c164ee545e7f121acb8f61))
* **ui:** wire detail panel + create/edit/delete + click-to-place ([c25fc6d](https://github.com/Bardesss/minimalpoi/commit/c25fc6d6ef3b0bcec140225df142f58afac2d0bb))
* **web:** Data & backups modal with import/export + sidebar entry ([ce9396b](https://github.com/Bardesss/minimalpoi/commit/ce9396b354ded63d1cb6dd173f890eee619e6224))
* **web:** enrich + portability data layer (types, api, hooks) ([0dd8806](https://github.com/Bardesss/minimalpoi/commit/0dd88061719fe05a9f11991326d5cbb811ed7b5a))
* **web:** enrich-from-URL in the Add modal with provenance + image preview ([bfd673b](https://github.com/Bardesss/minimalpoi/commit/bfd673bd167abc67bb7e6e104038feb620302912))


### Bug Fixes

* **backend:** cascade child rows on delete, protect last admin, category delete tombstone ([d54fe3c](https://github.com/Bardesss/minimalpoi/commit/d54fe3c5ad7166e4a82bc94dd34f3a1c35ed1673))
* **backend:** eliminate TestClient deprecation warning; pristine test output ([9a0523b](https://github.com/Bardesss/minimalpoi/commit/9a0523b699af9fe83c43ffdd998888418bc028ac))
* **backend:** enforce creator/admin authz on team edit/delete; validate member ids ([24bdd86](https://github.com/Bardesss/minimalpoi/commit/24bdd8608e4a3b6da826fab42e5395879488a4eb))
* **backend:** enforce rating 1-5, validate preferred team, guard missing POI on visits ([49443c8](https://github.com/Bardesss/minimalpoi/commit/49443c89fa2e4719c5de1200cb94a49a720e47ce))
* **backend:** keep httpx, narrowly ignore starlette httpx2 nudge (supply-chain caution) ([f7d26df](https://github.com/Bardesss/minimalpoi/commit/f7d26dff35e8b9f5f8ec9f3539cc31bfadcca77e))
* **backend:** preferred_team_id is a plain int, drop premature Team stub ([97d3fe9](https://github.com/Bardesss/minimalpoi/commit/97d3fe9320bd884e17ea1c5cf891e31ecf86d9a2))
* **backend:** require team membership to tag visits and set preferred team ([568ddef](https://github.com/Bardesss/minimalpoi/commit/568ddef13e9105e1d6bdb716801e68ba55cc94ca))
* **backend:** SQL count for admin guard; 403/404 coverage for user mgmt ([fb44d99](https://github.com/Bardesss/minimalpoi/commit/fb44d99ee47b8d00d38821ad9cef7e4b498e432a))
* **backend:** tidy existence check, samesite on logout, test disabled-user login ([a89d339](https://github.com/Bardesss/minimalpoi/commit/a89d339d7a7887a12ee13788fceaf8f0d5ad9ab6))
* **ci:** publish image inside the release-please job ([728fbff](https://github.com/Bardesss/minimalpoi/commit/728fbff72e7380982dad13ef00ccd938adb8c98c))
* **ci:** publish image inside the release-please job ([7e20847](https://github.com/Bardesss/minimalpoi/commit/7e2084737a2390f76e165677c8c801a251de7016))
* **enrich:** accumulate JSON-LD script body across handle_data; [@graph](https://github.com/graph) test ([c2a5e6d](https://github.com/Bardesss/minimalpoi/commit/c2a5e6d8f1ab40747ed736a180427759c1f9acb3))
* **enrich:** cap image download size; hostname-based gmaps detection ([f869a57](https://github.com/Bardesss/minimalpoi/commit/f869a5710d2802f3a67b5bead10dfb45cf191add))
* **enrich:** exclude query string from gmaps place name; stricter shortlink test ([bc17e37](https://github.com/Bardesss/minimalpoi/commit/bc17e37a543c8687d5d2a59684fcdd391cff521a))
* **enrich:** force per-request no-redirect in safe_get; document DNS-rebinding limitation ([8025e25](https://github.com/Bardesss/minimalpoi/commit/8025e251ae7c99ce41fd1c4a9d2e37932e6f1ed2))
* **enrich:** SSRF guard — validate host IPs + manual redirect revalidation ([e64206b](https://github.com/Bardesss/minimalpoi/commit/e64206bae837b4b45e0ee06d282f6a7e9fce599b))
* **enrich:** whitelist upload extensions; treat HTTP error as download failure in localize ([418603c](https://github.com/Bardesss/minimalpoi/commit/418603c57e5e28e226bee8f943d86f7b41b1b128))
* **security:** validate URL schemes for POI website link and image url() ([9cd02f5](https://github.com/Bardesss/minimalpoi/commit/9cd02f53a9ea36365fef7e811034ab310b2ea426))
* **security:** validate URL schemes for POI website link and image url() ([f723e3f](https://github.com/Bardesss/minimalpoi/commit/f723e3f6b63e8086c8f856414bce58bdc4713736))
* **trip:** don't push freshly-imported places back to TRIP same pass ([855a384](https://github.com/Bardesss/minimalpoi/commit/855a38499f184a6b7e3561468336181efc7ff0ab))
* **trip:** modern worker task idiom; log worker errors; tidy imports ([eeb2337](https://github.com/Bardesss/minimalpoi/commit/eeb2337ca3e52d88eab85b05a004db16e25f01cc))
* **trip:** null orphaned category_id on delete; status counts categories; inbound-edit + trip_wins tests ([ad4657a](https://github.com/Bardesss/minimalpoi/commit/ad4657ae14d7f66ac322488847abfd79fa8bfc9a))
* **ui:** drop unused ApiError import so tsc build passes ([6c5f883](https://github.com/Bardesss/minimalpoi/commit/6c5f88381460ef42531d4793f5f6d07f0514ec8e))
* **ui:** make add-mode POI modal non-blocking so map click-to-place works ([69734e6](https://github.com/Bardesss/minimalpoi/commit/69734e60824103f5e08d31981188aa3f3c675a9d))
* **ui:** opt into router v7 future flags; fix setup comment ([4033c75](https://github.com/Bardesss/minimalpoi/commit/4033c75834dd2f842fb849825d924ace7bfeb1a2))
* **web:** restore mocks in afterEach + drop dead fileRef in DataModal ([d377ec1](https://github.com/Bardesss/minimalpoi/commit/d377ec19b0e32fd6de56926221745e73d98c523f))

## [0.2.0](https://github.com/Bardesss/minimalpoi/compare/minimalpoi-v0.1.0...minimalpoi-v0.2.0) (2026-06-25)


### Features

* **api:** default map_tile_url to Carto voyager style.json ([1b51274](https://github.com/Bardesss/minimalpoi/commit/1b51274533ff0d9881db0f19df9131498c7df7f5))
* **backend:** admin user management ([ab74ea0](https://github.com/Bardesss/minimalpoi/commit/ab74ea02f43f3ded2634a1a10c6a3b279dbd175f))
* **backend:** auth dependencies + test client fixture ([b360cf7](https://github.com/Bardesss/minimalpoi/commit/b360cf77fc796be0e9ad8afb7a6e0a728f3d51c4))
* **backend:** categories CRUD with lucide icon + TRIP sync-state fields ([6de6786](https://github.com/Bardesss/minimalpoi/commit/6de67866cd1a2c6a9498a12e8ce4411256b357bb))
* **backend:** db engine/session + User model ([9708e7b](https://github.com/Bardesss/minimalpoi/commit/9708e7b244e482a7889583d2283fdac2d32e054b))
* **backend:** first-run setup, login/logout, me ([741a13c](https://github.com/Bardesss/minimalpoi/commit/741a13c50b4b5f83a5ae93901bd04ff9659c01c4))
* **backend:** password hashing + JWT helpers ([015707e](https://github.com/Bardesss/minimalpoi/commit/015707e7cae74dc18759a144b1ff7c9a58354659))
* **backend:** per-user comment threads ([d9a06e1](https://github.com/Bardesss/minimalpoi/commit/d9a06e14581db5fae30d4dc7c6a6f7c79bd47689))
* **backend:** per-user visits with team+rating and preferred team ([83dbd78](https://github.com/Bardesss/minimalpoi/commit/83dbd78e571782337700d9781c724993df71976e))
* **backend:** per-user wishlist ([1b699ca](https://github.com/Bardesss/minimalpoi/commit/1b699ca9f1dc50e7c0340acd1e2c9dacdc38ffb5))
* **backend:** POI CRUD + duplicate detection + delete tombstones ([4007457](https://github.com/Bardesss/minimalpoi/commit/4007457c2f87dc807ce8f329e61a09a76845cf95))
* **backend:** scaffold app, config, secret bootstrap, crypto ([baf9cfb](https://github.com/Bardesss/minimalpoi/commit/baf9cfb3c2c2330cecc4863d384f691650665c89))
* **backend:** settings singleton with encrypted TRIP credentials ([7e3a6f6](https://github.com/Bardesss/minimalpoi/commit/7e3a6f62e8bcfcf987478fdd40ffb263274607d6))
* **backend:** teams CRUD ([59ab97d](https://github.com/Bardesss/minimalpoi/commit/59ab97d5d5c32fb2519a3c40faaeaa23bc4374ff))
* **docker:** single-process Dockerfile + compose + .dockerignore; robust SPA test ([7ada23b](https://github.com/Bardesss/minimalpoi/commit/7ada23bb36eb2db6351140ea65433560452c28e2))
* **enrich:** async fetch_url with httpx (runtime dep) ([8bbc542](https://github.com/Bardesss/minimalpoi/commit/8bbc542f97e20d7818fbcebd5bf9881f13ba97bd))
* **enrich:** google maps detection, coords, shortlink, places lookup ([065f529](https://github.com/Bardesss/minimalpoi/commit/065f529524eea5e8768e64bbbe46a0506b68defc))
* **enrich:** image localization, upload endpoint, static serving ([ddb3f29](https://github.com/Bardesss/minimalpoi/commit/ddb3f2973106634c57a7e2b757cd7da22d520d19))
* **enrich:** nominatim geocoding fallback ([4483f9a](https://github.com/Bardesss/minimalpoi/commit/4483f9af37d387839d3274c5f202dc52c8599090))
* **enrich:** OpenGraph + JSON-LD parsers (stdlib) ([723bab7](https://github.com/Bardesss/minimalpoi/commit/723bab7226cc639404f83f4b4c095b8fbfcf39e1))
* **enrich:** orchestration service with provenance ([8ccc4bd](https://github.com/Bardesss/minimalpoi/commit/8ccc4bd24e5e2760469c8b7898c0e41812dca9c5))
* **enrich:** parse Twitter Card + OG/Place geo, broaden JSON-LD types ([cfa8374](https://github.com/Bardesss/minimalpoi/commit/cfa8374ff8e4048fc828595dc2041c9113a10b20))
* **enrich:** POST /api/enrich endpoint ([ae7a377](https://github.com/Bardesss/minimalpoi/commit/ae7a3777971648232db5ebb906851db3ea7a291a))
* **enrich:** Twitter + OG/Place-geo fallbacks with first-wins precedence ([df608cc](https://github.com/Bardesss/minimalpoi/commit/df608cc171fbbfe6dd02bcfed0227854822335e4))
* **pois:** import (GeoJSON/CSV) + export (GeoJSON) endpoints ([1eae0cf](https://github.com/Bardesss/minimalpoi/commit/1eae0cfe336c240f7eb1fb5545d421e087b7910e))
* **portability:** pure GeoJSON/CSV parse + GeoJSON serialize ([7a6db73](https://github.com/Bardesss/minimalpoi/commit/7a6db73b0742e46b7336e378757e993891533302))
* **trip:** authenticated TRIP client (login/relogin) ([c967c64](https://github.com/Bardesss/minimalpoi/commit/c967c64c4eb66f110a4305ca9385cd97b06a97cd))
* **trip:** category reconcile (create/import) + sync system user ([ad163f6](https://github.com/Bardesss/minimalpoi/commit/ad163f62a579fdcd43037066965205c433869ea8))
* **trip:** comparable snapshots + change detection ([7ae04c7](https://github.com/Bardesss/minimalpoi/commit/7ae04c7e62277df761f1bc8ba675bdd887f4365e))
* **trip:** deletion propagation (both ways) + conflict policies ([314a542](https://github.com/Bardesss/minimalpoi/commit/314a54236c0c53f6c538eb87fef5549c312aa351))
* **trip:** initial reconcile links duplicates instead of doubling ([a224d53](https://github.com/Bardesss/minimalpoi/commit/a224d537a0b7208b1c9f29bf9a2ac481bb6a8bc9))
* **trip:** place reconcile (import/create/update/inbound) ([ab4eaff](https://github.com/Bardesss/minimalpoi/commit/ab4eaff33c98b54934623c7b0e111aa96957b6df))
* **trip:** places + categories CRUD on TripClient ([40e46d1](https://github.com/Bardesss/minimalpoi/commit/40e46d1eda38cca2bd87e16b44adb3b422461be5))
* **trip:** pure field mapping POI&lt;-&gt;TRIP ([48260e5](https://github.com/Bardesss/minimalpoi/commit/48260e514013c64a1abeb00d9a3bd219bad3c21c))
* **trip:** sync service, /api/sync endpoints, background worker ([ee9b664](https://github.com/Bardesss/minimalpoi/commit/ee9b664c31d017bfe7ad2314cfdb6a40661c6eea))
* **ui:** add design-token theme module and tint derivation ([c61f414](https://github.com/Bardesss/minimalpoi/commit/c61f4144934c6bac6935a8936705c202aa1007b2))
* **ui:** add FAB and add/edit POI form modal with duplicate warning ([9a633c2](https://github.com/Bardesss/minimalpoi/commit/9a633c24d9d63d131299681ed15bed2f59572a31))
* **ui:** AppShell + sidebar wired to live POI/category data ([fff8cb8](https://github.com/Bardesss/minimalpoi/commit/fff8cb84a466eae5ee2dc6918cf50595ca014c58))
* **ui:** auth API functions with MSW test harness ([485e819](https://github.com/Bardesss/minimalpoi/commit/485e819e65041f46bb0b9793b4ff7a166a274921))
* **ui:** auth context bootstrapped from /api/auth/me ([dba43f0](https://github.com/Bardesss/minimalpoi/commit/dba43f0fb8fa2eddcfcbed809ca8e4f425158884))
* **ui:** global CSS with self-hosted fonts, scrollbar, keyframes ([dec3e29](https://github.com/Bardesss/minimalpoi/commit/dec3e29dd7c617535b5e3e1f44d392bbaa57a45c))
* **ui:** lucide category-icon resolver with fallback ([e8aaf4a](https://github.com/Bardesss/minimalpoi/commit/e8aaf4a4c03a06f83389a50863bed3bc808de64a))
* **ui:** MapView with clustered, category-colored POI layers ([2c46fbd](https://github.com/Bardesss/minimalpoi/commit/2c46fbd256ffdf7f719cee9b91f7c0060628ea18))
* **ui:** mount map, legend, expand button; wire select/fly/fit ([2d1617b](https://github.com/Bardesss/minimalpoi/commit/2d1617ba692776c12ee29e2833360b615f02b0ab))
* **ui:** POI detail panel with edit and two-step delete ([0036e22](https://github.com/Bardesss/minimalpoi/commit/0036e22108fddd9cb7127a2f35702154695acb36))
* **ui:** pure map helpers (features, colors, bounds, style resolve) ([911134f](https://github.com/Bardesss/minimalpoi/commit/911134fcd873c266d6b81beecba996149c55bd89))
* **ui:** react-query provider, data/mutation hooks, test harness ([5a381ec](https://github.com/Bardesss/minimalpoi/commit/5a381ec28a47e598f8e26a818200fdf05d5d8164))
* **ui:** restyle login page onto design system ([b53178c](https://github.com/Bardesss/minimalpoi/commit/b53178c1351986d8423fb5f967123edd0387b19b))
* **ui:** restyle setup page onto design system ([6a872ce](https://github.com/Bardesss/minimalpoi/commit/6a872cecdabefd8727300669e9cb82b2aca34617))
* **ui:** scaffold Vite + React + TS app with dev proxy and test harness ([94ce672](https://github.com/Bardesss/minimalpoi/commit/94ce67298b69e5bac9f558ec23e12c149f29293e))
* **ui:** serve built SPA from FastAPI with API/image precedence ([bc246fc](https://github.com/Bardesss/minimalpoi/commit/bc246fc06ed53594887a109c8653967b848096ed))
* **ui:** setup/login/logout flow with guarded routes ([80f27e7](https://github.com/Bardesss/minimalpoi/commit/80f27e7372bb9d6e5cc916d64b14ed56f935e316))
* **ui:** sidebar header, account footer, POI card and list ([c935ebe](https://github.com/Bardesss/minimalpoi/commit/c935ebe35cd3e22f44c1ac31626f98f8e0a6bacc))
* **ui:** typed apiFetch client with ApiError and credentials ([9937d23](https://github.com/Bardesss/minimalpoi/commit/9937d233734f9598c9c3899fa8159d0edf212b59))
* **ui:** typed POI/category/settings API fetchers ([4b87f3b](https://github.com/Bardesss/minimalpoi/commit/4b87f3b9b3f6169ba5c164ee545e7f121acb8f61))
* **ui:** wire detail panel + create/edit/delete + click-to-place ([c25fc6d](https://github.com/Bardesss/minimalpoi/commit/c25fc6d6ef3b0bcec140225df142f58afac2d0bb))
* **web:** Data & backups modal with import/export + sidebar entry ([ce9396b](https://github.com/Bardesss/minimalpoi/commit/ce9396b354ded63d1cb6dd173f890eee619e6224))
* **web:** enrich + portability data layer (types, api, hooks) ([0dd8806](https://github.com/Bardesss/minimalpoi/commit/0dd88061719fe05a9f11991326d5cbb811ed7b5a))
* **web:** enrich-from-URL in the Add modal with provenance + image preview ([bfd673b](https://github.com/Bardesss/minimalpoi/commit/bfd673bd167abc67bb7e6e104038feb620302912))


### Bug Fixes

* **backend:** cascade child rows on delete, protect last admin, category delete tombstone ([d54fe3c](https://github.com/Bardesss/minimalpoi/commit/d54fe3c5ad7166e4a82bc94dd34f3a1c35ed1673))
* **backend:** eliminate TestClient deprecation warning; pristine test output ([9a0523b](https://github.com/Bardesss/minimalpoi/commit/9a0523b699af9fe83c43ffdd998888418bc028ac))
* **backend:** enforce creator/admin authz on team edit/delete; validate member ids ([24bdd86](https://github.com/Bardesss/minimalpoi/commit/24bdd8608e4a3b6da826fab42e5395879488a4eb))
* **backend:** enforce rating 1-5, validate preferred team, guard missing POI on visits ([49443c8](https://github.com/Bardesss/minimalpoi/commit/49443c89fa2e4719c5de1200cb94a49a720e47ce))
* **backend:** keep httpx, narrowly ignore starlette httpx2 nudge (supply-chain caution) ([f7d26df](https://github.com/Bardesss/minimalpoi/commit/f7d26dff35e8b9f5f8ec9f3539cc31bfadcca77e))
* **backend:** preferred_team_id is a plain int, drop premature Team stub ([97d3fe9](https://github.com/Bardesss/minimalpoi/commit/97d3fe9320bd884e17ea1c5cf891e31ecf86d9a2))
* **backend:** require team membership to tag visits and set preferred team ([568ddef](https://github.com/Bardesss/minimalpoi/commit/568ddef13e9105e1d6bdb716801e68ba55cc94ca))
* **backend:** SQL count for admin guard; 403/404 coverage for user mgmt ([fb44d99](https://github.com/Bardesss/minimalpoi/commit/fb44d99ee47b8d00d38821ad9cef7e4b498e432a))
* **backend:** tidy existence check, samesite on logout, test disabled-user login ([a89d339](https://github.com/Bardesss/minimalpoi/commit/a89d339d7a7887a12ee13788fceaf8f0d5ad9ab6))
* **enrich:** accumulate JSON-LD script body across handle_data; [@graph](https://github.com/graph) test ([c2a5e6d](https://github.com/Bardesss/minimalpoi/commit/c2a5e6d8f1ab40747ed736a180427759c1f9acb3))
* **enrich:** cap image download size; hostname-based gmaps detection ([f869a57](https://github.com/Bardesss/minimalpoi/commit/f869a5710d2802f3a67b5bead10dfb45cf191add))
* **enrich:** exclude query string from gmaps place name; stricter shortlink test ([bc17e37](https://github.com/Bardesss/minimalpoi/commit/bc17e37a543c8687d5d2a59684fcdd391cff521a))
* **enrich:** force per-request no-redirect in safe_get; document DNS-rebinding limitation ([8025e25](https://github.com/Bardesss/minimalpoi/commit/8025e251ae7c99ce41fd1c4a9d2e37932e6f1ed2))
* **enrich:** SSRF guard — validate host IPs + manual redirect revalidation ([e64206b](https://github.com/Bardesss/minimalpoi/commit/e64206bae837b4b45e0ee06d282f6a7e9fce599b))
* **enrich:** whitelist upload extensions; treat HTTP error as download failure in localize ([418603c](https://github.com/Bardesss/minimalpoi/commit/418603c57e5e28e226bee8f943d86f7b41b1b128))
* **security:** validate URL schemes for POI website link and image url() ([9cd02f5](https://github.com/Bardesss/minimalpoi/commit/9cd02f53a9ea36365fef7e811034ab310b2ea426))
* **security:** validate URL schemes for POI website link and image url() ([f723e3f](https://github.com/Bardesss/minimalpoi/commit/f723e3f6b63e8086c8f856414bce58bdc4713736))
* **trip:** don't push freshly-imported places back to TRIP same pass ([855a384](https://github.com/Bardesss/minimalpoi/commit/855a38499f184a6b7e3561468336181efc7ff0ab))
* **trip:** modern worker task idiom; log worker errors; tidy imports ([eeb2337](https://github.com/Bardesss/minimalpoi/commit/eeb2337ca3e52d88eab85b05a004db16e25f01cc))
* **trip:** null orphaned category_id on delete; status counts categories; inbound-edit + trip_wins tests ([ad4657a](https://github.com/Bardesss/minimalpoi/commit/ad4657ae14d7f66ac322488847abfd79fa8bfc9a))
* **ui:** drop unused ApiError import so tsc build passes ([6c5f883](https://github.com/Bardesss/minimalpoi/commit/6c5f88381460ef42531d4793f5f6d07f0514ec8e))
* **ui:** make add-mode POI modal non-blocking so map click-to-place works ([69734e6](https://github.com/Bardesss/minimalpoi/commit/69734e60824103f5e08d31981188aa3f3c675a9d))
* **ui:** opt into router v7 future flags; fix setup comment ([4033c75](https://github.com/Bardesss/minimalpoi/commit/4033c75834dd2f842fb849825d924ace7bfeb1a2))
* **web:** restore mocks in afterEach + drop dead fileRef in DataModal ([d377ec1](https://github.com/Bardesss/minimalpoi/commit/d377ec19b0e32fd6de56926221745e73d98c523f))

## Changelog

All notable changes to MinimalPOI are recorded here. This file is maintained
automatically by release-please from Conventional Commit messages.
