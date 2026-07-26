# Changelog

## [3.5.0](https://github.com/Bardesss/minimalpoi/compare/v3.4.0...v3.5.0) (2026-07-26)


### Features

* **ui:** branded startup splash instead of bare Loading text ([bc7adf6](https://github.com/Bardesss/minimalpoi/commit/bc7adf6dddfd1517f1d09b42730d510590c7d126))


### Bug Fixes

* **map:** hide the empty image band on imageless place popups ([b00278a](https://github.com/Bardesss/minimalpoi/commit/b00278a4c93fe54be4c8420cd7e0e457e66549c6))
* **routes:** equalize collapsed day-card height ([7d034bf](https://github.com/Bardesss/minimalpoi/commit/7d034bfbab522eaf247947d1bcaa73de08bdc38d))
* startup splash + imageless card / day-card polish ([16434a5](https://github.com/Bardesss/minimalpoi/commit/16434a5420b1dfc00886af9d1cb261de6cb6d5cb))

## [3.4.0](https://github.com/Bardesss/minimalpoi/compare/v3.3.0...v3.4.0) (2026-07-25)


### Features

* **ui:** compact, branded mobile sheet header ([f9e4de3](https://github.com/Bardesss/minimalpoi/commit/f9e4de3feb48fc8325fd71fe245fe13a176a141e))
* **ui:** compact, branded mobile sheet header ([b7381fc](https://github.com/Bardesss/minimalpoi/commit/b7381fc2f4148c16757a29b577c7418fe78e05a4))

## [3.3.0](https://github.com/Bardesss/minimalpoi/compare/v3.2.0...v3.3.0) (2026-07-25)


### Features

* **ui:** compact desktop header — icon switcher + inline filters ([732c85d](https://github.com/Bardesss/minimalpoi/commit/732c85d41d03e741993146417a53298ba52201d6))
* **ui:** compact desktop header — icon switcher, inline filters, chips kept ([1a63840](https://github.com/Bardesss/minimalpoi/commit/1a63840710eba3fde5dfe9678beb97e361114ddc))

## [3.2.0](https://github.com/Bardesss/minimalpoi/compare/v3.1.0...v3.2.0) (2026-07-25)


### Features

* **ui:** /?place=&lt;id&gt; deep-link preselects a POI ([6773e88](https://github.com/Bardesss/minimalpoi/commit/6773e8874b0cee2ffcbe530810668b80250ed2eb))
* **ui:** compact icon tabs for the Map/Routes switcher ([ed5c347](https://github.com/Bardesss/minimalpoi/commit/ed5c347da7b2ac441799d61f9880b24047641a20))
* **ui:** FilterPopover — collapse visited/sort/view behind one trigger ([d1582e6](https://github.com/Bardesss/minimalpoi/commit/d1582e68a70eb8bae586ec9b616aeae46afa7f6d))
* **ui:** main-map markers show the mini info card on hover ([26dbb5b](https://github.com/Bardesss/minimalpoi/commit/26dbb5be64f9f6d34c6b5dda183a0d01ab8c30fa))
* **ui:** move the place count into the sheet handle / sidebar header ([0204a45](https://github.com/Bardesss/minimalpoi/commit/0204a4555e326be991a0a2f5a549d8a84f134cfd))
* **ui:** POI mini info card + header declutter ([9ac835d](https://github.com/Bardesss/minimalpoi/commit/9ac835ddf568205c4ee272db955184bd2810e244))
* **ui:** PoiMiniCard popup builder (photo/name/website/open + add) ([7721a40](https://github.com/Bardesss/minimalpoi/commit/7721a406cde948742d9c588de57f35990306512c))
* **ui:** route map uses the mini info card (nearby, on-route, itinerary hover) ([51eda97](https://github.com/Bardesss/minimalpoi/commit/51eda970d59c576e86fe43295fc555e3170fd2fc))


### Bug Fixes

* **ui:** FilterPopover keyboard a11y + drag-handle userSelect + test tidy ([291de9b](https://github.com/Bardesss/minimalpoi/commit/291de9bc5e0b08dcf29cc1772bc930fda9a28a80))
* **ui:** keep FilterPopover open on Tab between its controls ([1a96e85](https://github.com/Bardesss/minimalpoi/commit/1a96e851df107ae11bef1b7de4c372ac1a0d8381))
* **ui:** PoiMiniCard close button tap target (bigTap scaling) ([a62c0b2](https://github.com/Bardesss/minimalpoi/commit/a62c0b2b1f0dc282c8e292c302a56cea0248ac06))
* **ui:** PoiMiniCard design consistency (tint, radii, button styles) ([5119b52](https://github.com/Bardesss/minimalpoi/commit/5119b525748a00e3bbecede1c25acbb53a52fb95))
* **ui:** suppress transient route-map hover cards while a pinned card is open ([95d6e70](https://github.com/Bardesss/minimalpoi/commit/95d6e70598a97ccaa936c72d23c3fee07bffe55b))

## [3.1.0](https://github.com/Bardesss/minimalpoi/compare/v3.0.0...v3.1.0) (2026-07-24)


### Features

* **deploy:** reverse-proxy support (proxy headers) + docs ([eabb67d](https://github.com/Bardesss/minimalpoi/commit/eabb67dcd7d95e08afa6c8ffd717ee0cf50c6085))
* **share:** public read-only route endpoint + password unlock ([22dc94d](https://github.com/Bardesss/minimalpoi/commit/22dc94dd951c34ffea07122eadc47b7f3b36dcfa))
* **share:** public read-only route links + reverse-proxy readiness ([3d36060](https://github.com/Bardesss/minimalpoi/commit/3d360609e478200f5fa6bbe7f5a0b765905c426c))
* **share:** route share manage endpoints + share field on RouteDetail ([dd8cd6d](https://github.com/Bardesss/minimalpoi/commit/dd8cd6de76ab9584ef24643cbb2ed05b3c9cae1b))
* **share:** RouteShare model + share/public schemas ([579cbab](https://github.com/Bardesss/minimalpoi/commit/579cbabb2f6823d6dabeae2b0910e4b63f1af316))
* **ui:** /s/:token public read-only route page ([1163d67](https://github.com/Bardesss/minimalpoi/commit/1163d67fecb4bef65ea8cc59885b634db8fc749f))
* **ui:** public-link share manager in the route editor ([489f0a5](https://github.com/Bardesss/minimalpoi/commit/489f0a536f0bd16b68c04fdf856c4756fe4f2354))


### Bug Fixes

* **share:** bind grant to password version + strict unlock rate limit ([63a59e2](https://github.com/Bardesss/minimalpoi/commit/63a59e2554600a387ee555986e7afb0078072fbf))
* **share:** never broadcast the share token over SSE ([6ad5976](https://github.com/Bardesss/minimalpoi/commit/6ad5976a72793e6f8565696b7a25fc99dfad5569))
* **share:** PUT share leaves expiry unchanged when not provided ([418ccc7](https://github.com/Bardesss/minimalpoi/commit/418ccc769ff2b97d107ef24ed728de33c7233aee))
* **share:** set Secure on the share grant cookie (match auth cookie) ([d1452c6](https://github.com/Bardesss/minimalpoi/commit/d1452c68d1bf0f2cf8b68b161879f2eb8fe7657c))
* **ui:** clear share password field after set + clean up copy timeout ([cd2d49f](https://github.com/Bardesss/minimalpoi/commit/cd2d49fc43041372dd8f3a085f6846cdf20e3c41))
* **ui:** encodeURIComponent the public share token in API URLs ([f6f2110](https://github.com/Bardesss/minimalpoi/commit/f6f2110b29313b02b3db287b6aa31c2b39fa517b))

## [3.0.0](https://github.com/Bardesss/minimalpoi/compare/v2.21.0...v3.0.0) (2026-07-24)


### Features

* **map:** add tracking GeolocateControl to both maps ([f0dfece](https://github.com/Bardesss/minimalpoi/commit/f0dfece6a3e8b657b5d4de35c17b0a21f4203bd9))
* **map:** map interaction + geolocation (Slice 1) ([123b336](https://github.com/Bardesss/minimalpoi/commit/123b33662a29aaaae144e907c5903b719e41605f))
* **map:** pointer cursor + hover name tooltip on POI markers ([2690b12](https://github.com/Bardesss/minimalpoi/commit/2690b12af2a2ff76db214a3a398e26e237acb211))
* **map:** routeSignature helper (node id+coord fingerprint) ([d437a67](https://github.com/Bardesss/minimalpoi/commit/d437a6753fc199e961fb2f8c5712fd3e3bbba5a1))
* **map:** seed the nearest-POI sort from the user's location fix ([39a1207](https://github.com/Bardesss/minimalpoi/commit/39a120746bf3890e214fea961c08c08677b6552e))
* **ui:** ≥44px touch targets on mobile controls ([ef58443](https://github.com/Bardesss/minimalpoi/commit/ef5844361ce20b53be8565ddd62ae8f3f553c78a))
* **ui:** detail panel + navigation (Slice 2) ([41ef564](https://github.com/Bardesss/minimalpoi/commit/41ef56488a27e71eb62dda32ee8b975403c040fc))
* **ui:** drive route selection from the URL (/routes/:id) ([0b11a58](https://github.com/Bardesss/minimalpoi/commit/0b11a588dc192c2918be07dbd281df2c1f233d72))
* **ui:** escape/backdrop/back close on all dialogs + detail panel ([70cdc0d](https://github.com/Bardesss/minimalpoi/commit/70cdc0d73f826ab79958f8308153b179b9a7c3ff))
* **ui:** focus search with / or Ctrl/Cmd-K ([b6c1d42](https://github.com/Bardesss/minimalpoi/commit/b6c1d42b94e71a83fbb4ebd5d4b239ba487c5c0c))
* **ui:** keyboard-operable APG export menu ([c47bf9a](https://github.com/Bardesss/minimalpoi/commit/c47bf9ad4c832fcdd7b04edd541b26e290242d50))
* **ui:** mobile ergonomics (Slice 3) ([1d6683f](https://github.com/Bardesss/minimalpoi/commit/1d6683f2e516eae14cef12ddef34adcba981dc78))
* **ui:** mobile pick-on-map (crosshair + use-this-location) ([9be7e51](https://github.com/Bardesss/minimalpoi/commit/9be7e51b32436771555a79cde86ff1a0c5a37e04))
* **ui:** PoiFormModal escape/backdrop close, dialog name, enter-to-submit ([f01ea01](https://github.com/Bardesss/minimalpoi/commit/f01ea012c0a6d2b4a4b36d619a8bbbf673f2e22c))
* **ui:** restore reference hover affordances ([33ed344](https://github.com/Bardesss/minimalpoi/commit/33ed344febce93d2271574eb97638c0596e865f3))
* **ui:** scroll the selected POI card into view on marker select ([2babba4](https://github.com/Bardesss/minimalpoi/commit/2babba4e22de5866b453a2c0f53823041b305b9a))
* **ui:** search shortcut, virtualized list, wide-screen grid (Slice 4) ([494b8c5](https://github.com/Bardesss/minimalpoi/commit/494b8c593915d9fcc235561449032b9a063a7cb1))
* **ui:** useDialog closes on mobile hardware back ([7ceb22d](https://github.com/Bardesss/minimalpoi/commit/7ceb22d3bab9be7825f034092c3241d8db6138bb))
* **ui:** useDialog hook (escape, focus trap, backdrop close) ([32361cf](https://github.com/Bardesss/minimalpoi/commit/32361cf383e40dae7733129143b6cfc80bfd06bf))
* **ui:** UX/a11y foundation — shared dialog behavior + focus/hover/contrast (Slice 0) ([7c8c8a5](https://github.com/Bardesss/minimalpoi/commit/7c8c8a52ee622c2c4d0b77c0a821e10098b8f36e))
* **ui:** virtualize the POI list (windowed grid, responsive columns) ([512a457](https://github.com/Bardesss/minimalpoi/commit/512a457505e0c1001279fa95f31af09abdcd3101))
* **ui:** widen the sidebar on very wide viewports (room for a 3rd column) ([514c2e3](https://github.com/Bardesss/minimalpoi/commit/514c2e301ed817af3767405aa93f51f9cc3654dd))


### Bug Fixes

* **a11y:** AA text contrast + move row drag role onto the grip ([ba7f791](https://github.com/Bardesss/minimalpoi/commit/ba7f7917363e2ce6818afd38cb492bfc48a3e37e))
* **a11y:** keep the poi form dialog named while picking on map ([d783734](https://github.com/Bardesss/minimalpoi/commit/d7837348bc6fb265fb68983ccb5c71318fa7593e))
* **a11y:** let useDialog opt out of history so create-nav isn't reverted ([55129e7](https://github.com/Bardesss/minimalpoi/commit/55129e705bdbbd7da5a31ad8fe5ebdcc799e5bf0))
* **a11y:** only the top-most useDialog closes on escape/back (stacked dialogs) ([fdf3471](https://github.com/Bardesss/minimalpoi/commit/fdf3471ea313d9f59f152bf416aa4528f56bda00))
* **a11y:** pick-mode focus, coarse-pointer row icons, scope 16px to text inputs ([995e5dd](https://github.com/Bardesss/minimalpoi/commit/995e5dd131cfabc18ba139171b45f88cab5f7f33))
* **a11y:** pin desktop detail-panel footer above the scrolling body ([0f46c76](https://github.com/Bardesss/minimalpoi/commit/0f46c7605990ceb40ecc6539278bcd651d18feae))
* **a11y:** suppress the search hotkey while a dialog is open ([d473bcf](https://github.com/Bardesss/minimalpoi/commit/d473bcf4f0d149fc088715fab95b904c60d8a112))
* **a11y:** visible :focus-visible ring on inputs (WCAG 2.4.7) ([eb8df0b](https://github.com/Bardesss/minimalpoi/commit/eb8df0bab27bdf27929353dcac5051e958c94ad7))
* **map:** only re-fit route camera when node ids/coords change ([471747b](https://github.com/Bardesss/minimalpoi/commit/471747b6a6de638b37f0c045e04a36fba83ff393))
* **map:** seed refit signature on load + track hover tooltip on mousemove ([afd2254](https://github.com/Bardesss/minimalpoi/commit/afd2254cb5032aeba8de95608f7c175a668c1a06))
* **ui:** 100dvh viewport + safe-area inset on the mobile detail close ([f1bc3b1](https://github.com/Bardesss/minimalpoi/commit/f1bc3b17cbf7b5714fa5d22947439fdb223495bf))
* **ui:** 16px mobile inputs (no iOS zoom) + overscroll-behavior ([e89ecb4](https://github.com/Bardesss/minimalpoi/commit/e89ecb4f4f780756f44e80889e61c3088e0317a9))
* **ui:** guard Enter in PoiFormModal enrich input from submitting the form ([eafcf12](https://github.com/Bardesss/minimalpoi/commit/eafcf1292328964b2b065d70a5a7c22a9ad22157))
* **ui:** make hover affordances win over inline styles (!important) ([88edc10](https://github.com/Bardesss/minimalpoi/commit/88edc10219faacb622600e2a066f7131e32c263c))
* **ui:** reveal selected card only on selection change; ignore hotkey key-repeat ([384c67e](https://github.com/Bardesss/minimalpoi/commit/384c67ee8e51141e0d5eee2ce2ac5bbcbd02f4c8))
* **ui:** robust collapsed-search focus, drop dead data-poi-id, use default row measurement ([be9b20f](https://github.com/Bardesss/minimalpoi/commit/be9b20f50961f98b63464711531a5c83fadfda57))


### Miscellaneous Chores

* release MinimalPOI v3.0.0 ([0c5e794](https://github.com/Bardesss/minimalpoi/commit/0c5e7949b8723b35fda64f154cc67be99f69e2da))

## [2.21.0](https://github.com/Bardesss/minimalpoi/compare/v2.20.0...v2.21.0) (2026-07-23)


### Features

* **routes:** broadcast itinerary updates + deletes to live subscribers ([e966abc](https://github.com/Bardesss/minimalpoi/commit/e966abc627ee1d7dff52c090d8b9c8df0588a890))
* **routes:** create RouteEventHub in app lifespan ([f603128](https://github.com/Bardesss/minimalpoi/commit/f603128ef65ca1f723160df3e76542a08923bd31))
* **routes:** in-process RouteEventHub for live-sync fan-out ([31ad362](https://github.com/Bardesss/minimalpoi/commit/31ad3626350dadb43f93e735cb4c04c06413426a))
* **routes:** LAN-friendly live route collaboration (SSE) ([930561b](https://github.com/Bardesss/minimalpoi/commit/930561b1032e23933e0fda0388598ac5f3b3a08f))
* **routes:** per-tab clientId + X-Route-Client header on mutations ([4aa4b0a](https://github.com/Bardesss/minimalpoi/commit/4aa4b0a99c296aeb01e7eb08264604cb5eca63d8))
* **routes:** SSE endpoint streaming live route updates ([fa2c1be](https://github.com/Bardesss/minimalpoi/commit/fa2c1beeea137b8b9bf66df7f1de18e79da9b9c7))
* **routes:** useRouteEvents live-sync hook ([e2e7d82](https://github.com/Bardesss/minimalpoi/commit/e2e7d82a56644ac96725dbb37f2c3a594ffb1e0d))
* **routes:** wire live sync into RoutesPage + timeline edit guard ([43c682a](https://github.com/Bardesss/minimalpoi/commit/43c682a588e0115e0f66db69058d661e1c754cca))


### Bug Fixes

* **routes:** clear live-sync buffer on delete and on leaving a route ([a98bbd4](https://github.com/Bardesss/minimalpoi/commit/a98bbd46b6c0aaa99f2741bb8607415064525801))
* **routes:** clear live-sync buffer on route change + cover reconnect ([3cbf672](https://github.com/Bardesss/minimalpoi/commit/3cbf672099d6ec382f2f736d99db7f34f52568c5))
* **routes:** don't trust broadcast can_edit before initial fetch; type hub param ([c3c1096](https://github.com/Bardesss/minimalpoi/commit/c3c10966dbab126f9db34aac5ac8e4745a9abf4b))
* **routes:** tag live-sync buffer with its route to close same-commit race ([edd8887](https://github.com/Bardesss/minimalpoi/commit/edd8887fd13be4fe51dcc2397f2149e9c4cf8b7a))

## [2.20.0](https://github.com/Bardesss/minimalpoi/compare/v2.19.1...v2.20.0) (2026-07-22)


### Features

* **routes:** add-place chooser modal + unified route form modal ([a47d56b](https://github.com/Bardesss/minimalpoi/commit/a47d56b964da1ac0b7412c2300b8010a132a5e46))
* **routes:** AddPlaceModal with a method chooser and nights field ([7588481](https://github.com/Bardesss/minimalpoi/commit/7588481c0c524535ba5cd72c1c4e9fcd0af53905))
* **routes:** edit a route through the route form modal ([b7402e8](https://github.com/Bardesss/minimalpoi/commit/b7402e806f1434656c24862fc1df68314674a395))
* **routes:** extract ManualPointPanel for the place picker ([2afce8f](https://github.com/Bardesss/minimalpoi/commit/2afce8ff56d6042ebc195b2e29c415c89b56b9ec))
* **routes:** extract SavedPlacePanel for the place picker ([c035884](https://github.com/Bardesss/minimalpoi/commit/c035884fb53116c85bf8b8c25ab2f2603ba12b2e))
* **routes:** extract SearchPlacePanel for the place picker ([d0dbe53](https://github.com/Bardesss/minimalpoi/commit/d0dbe53e4d28f2976eebe896cc5a8855a065dff5))
* **routes:** itinerary bookends are display-only and symmetric; adds use the modal ([0645650](https://github.com/Bardesss/minimalpoi/commit/0645650e4ad5e2389ab621c3dc71f04bb471a7e9))
* **routes:** relocate a node in place, re-syncing the round-trip end ([0b09bd5](https://github.com/Bardesss/minimalpoi/commit/0b09bd50b122971e73571d0ddd91e3764cb36e4d))
* **routes:** RouteFormModal serves both New route and Edit route ([c3957f0](https://github.com/Bardesss/minimalpoi/commit/c3957f04dddd8cee270acb1e2dca54d6f025c55b))
* **routes:** useUpdateRoutePlan reconciles an edited route ([9938876](https://github.com/Bardesss/minimalpoi/commit/9938876b034a5d46bd8ad7839d449e8360ddcf35))


### Bug Fixes

* **routes:** guard blank manual coordinates; drop dead useUpdateRoute + stale comment ([0a926d5](https://github.com/Bardesss/minimalpoi/commit/0a926d5188c102fadfd1628f6f88ab3a531be452))

## [2.19.1](https://github.com/Bardesss/minimalpoi/compare/v2.19.0...v2.19.1) (2026-07-22)


### Bug Fixes

* **routes:** fold pinned start/end with a collapsed day ([f1eb9ad](https://github.com/Bardesss/minimalpoi/commit/f1eb9ad905520f8c1e1d1708ee8eca94715d68f0))
* **routes:** itinerary collapse + round-trip return display ([a0ec78d](https://github.com/Bardesss/minimalpoi/commit/a0ec78daf8e20605d81041aa9954a2963052d03c))
* **routes:** show the round-trip return as a real last-stop row ([753622e](https://github.com/Bardesss/minimalpoi/commit/753622ef65c2b188a21faad939fac165994eded3))

## [2.19.0](https://github.com/Bardesss/minimalpoi/compare/v2.18.0...v2.19.0) (2026-07-22)


### Features

* **routes:** scope route attachments to the team ([620f81a](https://github.com/Bardesss/minimalpoi/commit/620f81aca978639b6df121d8ad62fb3918058ae2))
* **routes:** scope route attachments to the team ([c9c3185](https://github.com/Bardesss/minimalpoi/commit/c9c318512d42c34362ec2fb42bd8f22d33fc82ac))

## [2.18.0](https://github.com/Bardesss/minimalpoi/compare/v2.17.1...v2.18.0) (2026-07-22)


### Features

* **routes:** export routes as GPX and KML ([0aeda4c](https://github.com/Bardesss/minimalpoi/commit/0aeda4c0554a9279486d4ff98ea96c6df58060d0))
* **routes:** GPX/KML exports; purge orphaned route-level attachments ([81db3d3](https://github.com/Bardesss/minimalpoi/commit/81db3d301e772a84660e28fd3d708d36de46d526))


### Bug Fixes

* **routes:** purge orphaned route-level attachments on startup ([40c8b3e](https://github.com/Bardesss/minimalpoi/commit/40c8b3e3104ae7221cfaebac3d727516f9960d14))

## [2.17.1](https://github.com/Bardesss/minimalpoi/compare/v2.17.0...v2.17.1) (2026-07-22)


### Bug Fixes

* **routes:** drop a stop onto an empty day instead of the next one ([37c2e0a](https://github.com/Bardesss/minimalpoi/commit/37c2e0aebedd64b7ad2d22da053c5d5801b8648d))
* **routes:** drop stops onto empty days; node-scope attachments ([7dccd6b](https://github.com/Bardesss/minimalpoi/commit/7dccd6beac22ebbcb2ca02290d0321ebadaa9edd))

## [2.17.0](https://github.com/Bardesss/minimalpoi/compare/v2.16.0...v2.17.0) (2026-07-22)


### Features

* **routes:** add stops and stays per day, drop the itinerary-level add ([814c644](https://github.com/Bardesss/minimalpoi/commit/814c644ce7c61f773a9b3ebad603fb098aab9039))
* **routes:** per-day add stop/stay; documents on stops/stays only ([6becd0d](https://github.com/Bardesss/minimalpoi/commit/6becd0daaf6bc30d724e255e69cf0ac14302aee1))

## [2.16.0](https://github.com/Bardesss/minimalpoi/compare/v2.15.0...v2.16.0) (2026-07-22)


### Features

* **routes:** create routes in a modal with a required start place ([b27105d](https://github.com/Bardesss/minimalpoi/commit/b27105d7bb05e4c783e2c9166a520f4af4f21d35))
* **routes:** route-creation modal, share logo, start/end in itinerary ([1b25bd6](https://github.com/Bardesss/minimalpoi/commit/1b25bd615014cc4c22f4941386b90d14752bab00))
* **routes:** show start/end as the first/last stops of the itinerary ([0b98268](https://github.com/Bardesss/minimalpoi/commit/0b98268688b2b267e2fca758edbf34043240b58e))


### Bug Fixes

* **share:** draw the real MapPin logo mark in the share image ([b210ad8](https://github.com/Bardesss/minimalpoi/commit/b210ad8ea4501f5ef26520521c8379ef53025283))

## [2.15.0](https://github.com/Bardesss/minimalpoi/compare/v2.14.0...v2.15.0) (2026-07-22)


### Features

* **poi:** add an Uncategorized filter chip and legend row ([eaf3e7e](https://github.com/Bardesss/minimalpoi/commit/eaf3e7e991658cfd5511eb9026ee4f5325dc9e1a))
* route share image + POI/routes bug fixes ([d7493c1](https://github.com/Bardesss/minimalpoi/commit/d7493c1419a6f9764e02ab777f4d6701c0d85fb3))


### Bug Fixes

* **poi:** validate coordinates and surface save failures ([2d1d549](https://github.com/Bardesss/minimalpoi/commit/2d1d549730027b682ab5e23db1e30c061f47deb4))
* **routes:** declutter the mobile route header ([1a78b51](https://github.com/Bardesss/minimalpoi/commit/1a78b51ffd9b42c76332d93730add830ba61c482))
* **routes:** touch-friendly itinerary drag on mobile ([e7b63bf](https://github.com/Bardesss/minimalpoi/commit/e7b63bf416a2e477c40c0fb444e191a3d70a7889))
* **share:** move brand to top so it no longer overlaps the stats ([950a9ef](https://github.com/Bardesss/minimalpoi/commit/950a9ef488aad42fdb0124b2ae32539ded6a7374))

## [2.14.0](https://github.com/Bardesss/minimalpoi/compare/v2.13.0...v2.14.0) (2026-07-21)


### Features

* **share:** canvas composite renderer for route share images ([50ef6bc](https://github.com/Bardesss/minimalpoi/commit/50ef6bc9a775263702d1d9896f944210d73fb1ee))
* **share:** Share image button opens the export modal on a route ([baffbd2](https://github.com/Bardesss/minimalpoi/commit/baffbd21a9cb80a5ee822646b512474a0cfbebae))
* **share:** share-image modal with format/variant, preview, download ([401e397](https://github.com/Bardesss/minimalpoi/commit/401e397e05a19b8ed8484c7ca9f6efa0ee98ff49))
* **share:** Strava-style shareable route image ([cf29ce2](https://github.com/Bardesss/minimalpoi/commit/cf29ce28313e2ea412d473fd9693689d40215566))


### Bug Fixes

* **share:** disable download/share when the render errored ([6e93138](https://github.com/Bardesss/minimalpoi/commit/6e931388c3f30bc515f4f7434ce9231ea8871fe4))
* **share:** remove irregular whitespace tripping eslint ([744ae65](https://github.com/Bardesss/minimalpoi/commit/744ae65b1e8afd75d3022d40663979981bd463d7))
* **share:** time out and clean up the hidden map on render failure ([606e911](https://github.com/Bardesss/minimalpoi/commit/606e9115220631e180825d48c01293d0f5c450e0))

## [2.13.0](https://github.com/Bardesss/minimalpoi/compare/v2.12.0...v2.13.0) (2026-07-21)


### Features

* **routes:** add node role + round_trip columns and schema fields ([b96938c](https://github.com/Bardesss/minimalpoi/commit/b96938c308ff88ce56c95badea16c046b7e790ee))
* **routes:** badge itinerary rows that are saved POIs ([6b6139a](https://github.com/Bardesss/minimalpoi/commit/6b6139a625a32fa080f4d6c1399e40716d25f742))
* **routes:** frontend types for node role and round_trip ([8421c0f](https://github.com/Bardesss/minimalpoi/commit/8421c0f66948918618a611b1c4d4a5b0af40e80c))
* **routes:** full-row drag handle, remove reorder arrows ([347100c](https://github.com/Bardesss/minimalpoi/commit/347100c07db286705ca792d69290a6fcafa70ccf))
* **routes:** hover an itinerary row to highlight it on the map ([43c2f98](https://github.com/Bardesss/minimalpoi/commit/43c2f98369072c7f064db37b011557d1ede0e0f2))
* **routes:** mirror start place onto a generated end for round trips ([e19e31f](https://github.com/Bardesss/minimalpoi/commit/e19e31f2a70724bb745867822f833bfb6ce0af56))
* **routes:** order nodes with start/end pinned to the ends ([86e433b](https://github.com/Bardesss/minimalpoi/commit/86e433b0343786c5f20de6b366a69e5a13217f31))
* **routes:** pinned start/end rows with round-trip toggle ([a830414](https://github.com/Bardesss/minimalpoi/commit/a83041475cc14e054216201ebcf3dc9aa38adcf8))
* **routes:** show map-matching order numbers in the itinerary ([f17ad0e](https://github.com/Bardesss/minimalpoi/commit/f17ad0e602ebe4a7c2543eeb24fb658fda015f75))
* **routes:** start/end glyphs and middle-only seq numbering on the map ([cbbb7c9](https://github.com/Bardesss/minimalpoi/commit/cbbb7c9a8bdf3beba7dca67033a966bcf13a1341))
* **routes:** store node role, enforce one start/end, coerce to stop ([6b40986](https://github.com/Bardesss/minimalpoi/commit/6b4098644f334845336fd630c84b6a4c4a726849))
* **routes:** timeline polish — start/end places, full-row drag, shared numbers, hover-highlight ([3cb224a](https://github.com/Bardesss/minimalpoi/commit/3cb224afb979b7fcb56acfada1057fd5e90d5af3))


### Bug Fixes

* **routes:** don't insert a mapped POI into a passed day ([a2f6387](https://github.com/Bardesss/minimalpoi/commit/a2f6387efea3388b5576f523309d7f62dfdda5ec))
* **routes:** ignore pinned start/end when inserting a mapped POI ([5daec3f](https://github.com/Bardesss/minimalpoi/commit/5daec3f4dbd403052142203422ea081ca32934cd))

## [2.12.0](https://github.com/Bardesss/minimalpoi/compare/v2.11.2...v2.12.0) (2026-07-16)


### Features

* **routes:** contained day cards in the itinerary ([aa35184](https://github.com/Bardesss/minimalpoi/commit/aa3518492a108a4f1397f2bd3e9f7a72b8c8d750))
* **routes:** restyle DayHeader into a day-card header with Day N marker ([f268a36](https://github.com/Bardesss/minimalpoi/commit/f268a36e2e2ee4fef864f7de5830995b4b1b7e25))
* **routes:** wrap each itinerary day in a card with an empty-day hint ([fdebeea](https://github.com/Bardesss/minimalpoi/commit/fdebeeaa6c37aac4148c768b1e490747e77cdff5))

## [2.11.2](https://github.com/Bardesss/minimalpoi/compare/v2.11.1...v2.11.2) (2026-07-16)


### Bug Fixes

* **routes:** drag no longer snaps a stop into the previous day ([71a9d7c](https://github.com/Bardesss/minimalpoi/commit/71a9d7cecf04dd4204cadbe6e6879bc932011d20))
* **routes:** stop drag snapping a stop into the previous day at a day boundary ([37fb328](https://github.com/Bardesss/minimalpoi/commit/37fb3285c40007db3339eca24551a8b7e105e29e))

## [2.11.1](https://github.com/Bardesss/minimalpoi/compare/v2.11.0...v2.11.1) (2026-07-16)


### Bug Fixes

* **routes:** navigate/share modal covers full screen on mobile ([83ac292](https://github.com/Bardesss/minimalpoi/commit/83ac29208408149950f03e3dd199ddfd3ca99e99))
* **routes:** portal navigate modal to body so it covers the viewport on mobile ([002ae92](https://github.com/Bardesss/minimalpoi/commit/002ae929e17761fa639c09ec547512e4b502aa59))

## [2.11.0](https://github.com/Bardesss/minimalpoi/compare/v2.10.0...v2.11.0) (2026-07-16)


### Features

* **routes:** replace Navigate text with lucide Navigation icon ([5f5396f](https://github.com/Bardesss/minimalpoi/commit/5f5396fd7b15039210ad3495ed118a5df3d86419))
* **routes:** replace Navigate text with Navigation icon ([7df0944](https://github.com/Bardesss/minimalpoi/commit/7df0944e4fd01c180720dff07d6512e97497e613))

## [2.10.0](https://github.com/Bardesss/minimalpoi/compare/v2.9.0...v2.10.0) (2026-07-16)


### Features

* **routes:** day_offset on stops (backend model, schema, endpoints) ([5f9578e](https://github.com/Bardesss/minimalpoi/commit/5f9578e3c051d769460ed6b4f5571969fb544ef5))
* **routes:** dragging a stop into another day updates its day_offset ([96d71ef](https://github.com/Bardesss/minimalpoi/commit/96d71ef14f73560b3496613a8a69f933441012d3))
* **routes:** expand multi-night stays into per-day groups ([f1a5aa3](https://github.com/Bardesss/minimalpoi/commit/f1a5aa3c13b095c170e7393533affe4f5325570b))
* **routes:** per-day + Add stop for multi-night stays ([55bc7d1](https://github.com/Bardesss/minimalpoi/commit/55bc7d1ff86325b59c6fba49e1e9fa1f766e6f46))
* **routes:** per-day stops within a multi-night stay ([fad5929](https://github.com/Bardesss/minimalpoi/commit/fad592969586754c73d545b5568bed1de24e3400))
* **routes:** placeInDay + dayOffsetForDrop placement helpers ([7331880](https://github.com/Bardesss/minimalpoi/commit/7331880fb68766a3322df91623322be97e1fa395))

## [2.9.0](https://github.com/Bardesss/minimalpoi/compare/v2.8.0...v2.9.0) (2026-07-16)


### Features

* **routes:** day collapse/fold + per-day navigation export ([c593e06](https://github.com/Bardesss/minimalpoi/commit/c593e0678422a848a52e0198dc993954f06f5fe5))
* **routes:** DayHeader collapse toggle, stop count, navigate button ([e07817a](https://github.com/Bardesss/minimalpoi/commit/e07817afd93d18dfb4cf74b11170d6e3e45d617b))
* **routes:** dayState lib — passed-day + passed-node helpers ([477b2d4](https://github.com/Bardesss/minimalpoi/commit/477b2d43bea6b74f0328e65165804ef8e533fb16))
* **routes:** de-emphasise passed days on the map ([1d9b5f5](https://github.com/Bardesss/minimalpoi/commit/1d9b5f58f02fc4c58271d2120ef5b29c23cb1f84))
* **routes:** fold past days by default + per-day navigate export ([a2e26cf](https://github.com/Bardesss/minimalpoi/commit/a2e26cf8894ac1afc6b8e1de5bf5f524e2affee9))
* **routes:** NavigateDayModal fallback export picker ([cc0a50e](https://github.com/Bardesss/minimalpoi/commit/cc0a50e216839c1f8cc5567209cc4be95da6c6df))
* **routes:** routeNav lib — day waypoints + export URL/GPX builders ([dfa7b1b](https://github.com/Bardesss/minimalpoi/commit/dfa7b1bb406c379a6c257b9db98d7c125cb16f7b))

## [2.8.0](https://github.com/Bardesss/minimalpoi/compare/v2.7.0...v2.8.0) (2026-07-16)


### Features

* **routes:** add formatDayLabel date-caption helper ([f35fcc9](https://github.com/Bardesss/minimalpoi/commit/f35fcc9c319343a905422c5344370b30d0e12bd5))
* **routes:** day headers and per-day driving totals in the itinerary ([3b4b7f8](https://github.com/Bardesss/minimalpoi/commit/3b4b7f80cfcf94db9729549ea60992dbfd997910))
* **routes:** day-by-day itinerary grouping ([3125688](https://github.com/Bardesss/minimalpoi/commit/31256883a55b284d0cec2b159cdef240f3901569))
* **routes:** group itinerary nodes by calendar day ([55b92cb](https://github.com/Bardesss/minimalpoi/commit/55b92cbbfc0a9bad2f040166258f1db38d19def4))

## [2.7.0](https://github.com/Bardesss/minimalpoi/compare/v2.6.0...v2.7.0) (2026-07-16)


### Features

* **routes:** add cheapest-insertion position helper ([6e74993](https://github.com/Bardesss/minimalpoi/commit/6e74993368b4d30dbd291add49b1da93b28423bf))
* **routes:** add computeDropPosition reorder helper ([c8d8a5a](https://github.com/Bardesss/minimalpoi/commit/c8d8a5af3a1ce1d6fd9ca2affb85b7c850d44a49))
* **routes:** drag-and-drop reorder for the itinerary ([10e3cc7](https://github.com/Bardesss/minimalpoi/commit/10e3cc7ea8d10baea397f271d8d07d273e28cdb4))
* **routes:** insert map-added POIs at their cheapest position ([ccd4545](https://github.com/Bardesss/minimalpoi/commit/ccd4545267612ab5a3929fa0b3eb5d648cc86e5d))
* **routes:** nearby POIs on the map — cheapest-insertion add + drag-and-drop reorder ([d8f1b1d](https://github.com/Bardesss/minimalpoi/commit/d8f1b1d90923588b8e148ea2edf4e2ffe743788f))

## [2.6.0](https://github.com/Bardesss/minimalpoi/compare/v2.5.0...v2.6.0) (2026-07-15)


### Features

* **routes:** add poisNotInRoute helper to hide already-added POIs ([e19cef9](https://github.com/Bardesss/minimalpoi/commit/e19cef9d3d9877b94995fc6e03ccf54eac417138))
* **routes:** show nearby POIs on the route map with click-to-add ([f7d0669](https://github.com/Bardesss/minimalpoi/commit/f7d0669c056f33c9ae3a6764a7badf2f03bbf3d6))
* **routes:** show nearby POIs on the route map with click-to-add ([b1f0bca](https://github.com/Bardesss/minimalpoi/commit/b1f0bcac038d487d2983c4e662cf4f721dfb7cf0))

## [2.5.0](https://github.com/Bardesss/minimalpoi/compare/v2.4.0...v2.5.0) (2026-07-15)


### Features

* **routes:** draw the real driving path instead of straight lines ([703b665](https://github.com/Bardesss/minimalpoi/commit/703b665a077aa08bc15331b768da4bf130f9bcff))
* **routes:** draw the real driving path instead of straight lines ([b1fcebe](https://github.com/Bardesss/minimalpoi/commit/b1fcebeb945019390d57fdc4a06b315b684a0ccb))

## [2.4.0](https://github.com/Bardesss/minimalpoi/compare/v2.3.1...v2.4.0) (2026-07-15)


### Features

* add toPoiCreate draft-to-payload mapper ([a3139ea](https://github.com/Bardesss/minimalpoi/commit/a3139ea4ff648765ee2b6c8bc7188be9f05c9d4a))
* **routes:** search Google Places in the route node picker ([4d2d458](https://github.com/Bardesss/minimalpoi/commit/4d2d45802e7fc1ae142c3ffe85c148494d14dd53))
* search Google Places in the route node picker ([4d78386](https://github.com/Bardesss/minimalpoi/commit/4d78386eec7fa024ca0fef67eb73e9c4f5ba018f))


### Bug Fixes

* reset Google picker state on mode switch and guard-test coverage ([d58f750](https://github.com/Bardesss/minimalpoi/commit/d58f750a88b5fca7ca642e0aba1c40fb00da9ed5))

## [2.3.1](https://github.com/Bardesss/minimalpoi/compare/v2.3.0...v2.3.1) (2026-07-15)


### Bug Fixes

* **routes:** edit selector always shows the route's current team ([97af3b3](https://github.com/Bardesss/minimalpoi/commit/97af3b367e0eef80dee4266847eb4cd7d552c564))
* **routes:** team-collab review follow-ups ([472a77d](https://github.com/Bardesss/minimalpoi/commit/472a77dc5acb7fb2eccad55748288adeb86ecd74))
* **teams:** null dangling route team_id on team delete ([1402a3f](https://github.com/Bardesss/minimalpoi/commit/1402a3f7c26e016b726cf27ca9fcc1e507067627))

## [2.3.0](https://github.com/Bardesss/minimalpoi/compare/v2.2.0...v2.3.0) (2026-07-15)


### Features

* **routes:** assign a route to a team; expose team_id/team_name ([6189c0d](https://github.com/Bardesss/minimalpoi/commit/6189c0ddc4bf5768984b98a4db14f8bb88825e84))
* **routes:** team members can edit; expose can_edit; owner-only team reassign ([46939a8](https://github.com/Bardesss/minimalpoi/commit/46939a871985b26f3696cf40f3c15054321612bd))
* **routes:** team selector + badge; gate edit on can_edit ([3ad3c47](https://github.com/Bardesss/minimalpoi/commit/3ad3c474f629ccf411d869b57e06a99b64bea180))
* **routes:** team-scoped collaboration ([b8fb467](https://github.com/Bardesss/minimalpoi/commit/b8fb467e1fca4110bfae6f3e02a65f0ff71d7db4))

## [2.2.0](https://github.com/Bardesss/minimalpoi/compare/v2.1.0...v2.2.0) (2026-07-15)


### Features

* **routes:** add NavToggle segmented Map/Routes nav ([7bcc81c](https://github.com/Bardesss/minimalpoi/commit/7bcc81cd95192f1d79f0b400ce759752d2932408))
* **routes:** add shared AppLayout chrome ([8fdbfc1](https://github.com/Bardesss/minimalpoi/commit/8fdbfc1edfc21b88554c4d5f5cd30a49b8120a4c))
* **routes:** edit and delete a route from the detail view ([fe14f88](https://github.com/Bardesss/minimalpoi/commit/fe14f88a52e7ad63538b12b6b93ae033786463ac))
* **routes:** optional end date, edit/delete, unified Map|Routes shell ([9b7e415](https://github.com/Bardesss/minimalpoi/commit/9b7e415845a7333d92636230f7efb30f21a42c57))
* **routes:** settings toggle + round-2 UX (end date, edit/delete, unified shell) ([eab4a2d](https://github.com/Bardesss/minimalpoi/commit/eab4a2db71192416907a28fdc892b99184a13c36))
* **routes:** show planned vs scheduled end date; optional end date on create ([c391d82](https://github.com/Bardesss/minimalpoi/commit/c391d8222555a3a7bbbcc4ef4ff640dbde2c0b59))
* **routes:** stored optional end_date; expose derived scheduled_end_date ([886816d](https://github.com/Bardesss/minimalpoi/commit/886816de97cfa8c08ab4b4013fc745a2713cfdc7))


### Bug Fixes

* **routes:** guard blank route edits, add patch-date test, drop dead Sidebar wrapper ([1cda792](https://github.com/Bardesss/minimalpoi/commit/1cda792c3a651885416e1276b92fefca6199c2ac))
* **routes:** reuse dangerButtonStyle for confirm-delete ([3d928fc](https://github.com/Bardesss/minimalpoi/commit/3d928fc3fe5fe949b5430347fd3cb2a1e1a0e8ac))
* **ui:** tagline reads 'Points of Interest Manager' ([35f4687](https://github.com/Bardesss/minimalpoi/commit/35f4687cc937b0e165e629ff678d40e9a32ce5a6))

## [2.1.0](https://github.com/Bardesss/minimalpoi/compare/v2.0.0...v2.1.0) (2026-07-15)


### Features

* **routes:** settings toggle, mobile touch targets & sync-tab gating ([5f3fabd](https://github.com/Bardesss/minimalpoi/commit/5f3fabd55bb5a6969a2c527f695cb9f923e13be9))
* **routes:** settings toggle, mobile touch targets, sync-tab gating ([94252e9](https://github.com/Bardesss/minimalpoi/commit/94252e95f40754be0b07904b799e57d6e9fab5b7))

## [2.0.0](https://github.com/Bardesss/minimalpoi/compare/v1.2.2...v2.0.0) (2026-07-15)


### Features

* opt-in Route module (stays/stops, travel legs, map, attachments, export) ([b8a43c3](https://github.com/Bardesss/minimalpoi/commit/b8a43c38dc60c262fe0d14f4362f79c396bd712f))
* **routes:** /routes route, gated nav entry, and route-line helper ([3c7566f](https://github.com/Bardesss/minimalpoi/commit/3c7566f6b873d6514e72e5a1fcc05fc3e183dc9d))
* **routes:** add Route/RouteNode/RouteLeg/RouteAttachment tables ([73080e6](https://github.com/Bardesss/minimalpoi/commit/73080e66ff3f4ade5f3506ef2f681e517ae20820))
* **routes:** add routes_enabled opt-in toggle to settings ([60de0ce](https://github.com/Bardesss/minimalpoi/commit/60de0ced2ba003bd47ff84b74fcb833aee9dc247))
* **routes:** add swappable travel calc (haversine + google directions) ([3ce72a0](https://github.com/Bardesss/minimalpoi/commit/3ce72a0f97c308994d03ccc983aeb879aa138876))
* **routes:** attachments with magic-byte allowlist and upload limit ([dc3872f](https://github.com/Bardesss/minimalpoi/commit/dc3872fdd324a49d94d65e5defdb496dee41bcf5))
* **routes:** CRUD router with opt-in gate and shared-collection authz ([72afbad](https://github.com/Bardesss/minimalpoi/commit/72afbad6f463ad3a0b7062167069dd695fe8f82d))
* **routes:** frontend types, api client, and query hooks ([204768f](https://github.com/Bardesss/minimalpoi/commit/204768f1839459ad2e8eecae75f40ac2ff4b00e9))
* **routes:** GeoJSON export endpoint ([9c21a30](https://github.com/Bardesss/minimalpoi/commit/9c21a308df03bfec67b1081d5d35a0d34b807a66))
* **routes:** leg recompute + date/total derivations ([cd253a7](https://github.com/Bardesss/minimalpoi/commit/cd253a7ccccce62543b06ffbfbaf998951db3574))
* **routes:** node add/edit/reorder/delete with leg recompute ([914dd58](https://github.com/Bardesss/minimalpoi/commit/914dd58266759f99fae4a9fa77d02b87c853ad36))
* **routes:** route map layer, attachments UI, and export button ([0df4ea7](https://github.com/Bardesss/minimalpoi/commit/0df4ea750f559261054c6a0905071c0aecfbf268))
* **routes:** routes list and editor timeline UI ([22df330](https://github.com/Bardesss/minimalpoi/commit/22df3304bc6bce5e2df0f0d79b0a3720e35224dc))


### Bug Fixes

* **routes:** clean up node attachments on delete_node ([5ae8fcc](https://github.com/Bardesss/minimalpoi/commit/5ae8fcc84c3a0592439e7fa281ede41ed8431c2c))


### Miscellaneous Chores

* release 2.0.0 ([7aea230](https://github.com/Bardesss/minimalpoi/commit/7aea230535528c9fd0a14698f4917080e0d228f3))

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
