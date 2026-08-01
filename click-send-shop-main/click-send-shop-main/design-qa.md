# Fixed Client Design QA

Status: candidate ready for user review; not approved for production.

## Visual source

- Mobile source of truth: `city-goods-client-prototype/design-references/option-2`.
- Category source of truth: `qa-category-horizontal-list-final.jpg`.
- Candidate screenshots: `artifacts/fixed-client-qa/final`.

## Verified

- Guest home, categories, search, product detail, cart, promotions, coupons, profile, login, register, forgot password, help, about, delivery, feature status, feedback, install, support, favorites, history, and 404.
- Mobile and tablet layouts at `375x667`, `390x844`, and `768x1024`.
- Desktop public routes at `1280x800` and `1440x900`.
- Fixed palette, responsive banner slots, category rail, horizontal category products, transparent product header, cart selection and total placement.
- Real production catalog data was checked through a read-only API bridge in the selected in-app browser. Category changes keep the left rail position and reset the product panel to the top.
- Product quick actions are functional: single-SKU items add directly to the cart with feedback, multi-variant items open the product detail flow, and sold-out actions are disabled. Mobile list actions remain `44x44`.
- Cart verification covered a real product, quantity controls, top-right select-all/cancel-select-all, left-aligned total, disabled checkout when nothing is selected, and the selected total updating from `RM330.00` to `RM0.00`.
- Product detail verification covered the transparent controls over the hero image and the solid sticky header after scrolling.
- Promotions use a dedicated `1200x525` WebP photograph with copy outside the image; product badges no longer cover catalog photography.
- Mobile home keeps flash-sale products compact while new arrivals, recommendations, and hot products use a clearer two-column editorial grid.
- The final in-app-browser pass rechecked the mobile home and promotions pages after the production build. Both rendered correctly and the browser console contained no runtime errors.
- The runtime route matrix now covers `41` mobile routes and states, including protected-route redirects, missing promotion/payment parameters, a real product detail, and the fixed 404 page. None crashed or produced horizontal overflow.
- A second in-app-browser matrix covered `24` public desktop routes at the browser's actual `1280x720` viewport. All rendered meaningful content without a white screen, fatal state, or horizontal overflow.
- A dedicated desktop refinement pass rechecked home, categories, search, product detail, cart, and profile at `1280x800`, plus categories at `1440x900`. Categories now use a shorter editorial hero and a three-column left-image/right-copy product flow; discovery search uses an intentional navigation-and-products split; cart restores a desktop page title and removes the nested gray summary heading.
- Login and register now use a dedicated `1040px` desktop composition with the approved storefront photograph and a restrained `420px` form column. They were visually rechecked at `1280x800`; login also passed at `390x844`, and register passed at `375x667`, with no horizontal overflow or clipped form content.
- Forgot password now follows the same desktop composition with a scroll-safe `460px` recovery column. The install route now uses the standard storefront header and a two-column Android/iOS instruction layout on desktop; both retain their single-column mobile flow and `44px` minimum controls.
- Help now uses a desktop category rail and FAQ column, feature status uses a compact two-column service matrix, and feedback uses a type rail beside the form. Delivery, about, CMS content, payment result, favorites, history, support, and 404 were rechecked and already matched the fixed storefront hierarchy.
- The same pass rechecked categories and search at `390x844`. Their approved mobile structure, independent category scrolling, bottom navigation, and two-column recent-product presentation remained unchanged.
- Accepted before/after evidence and current viewport captures are stored in `artifacts/desktop-audit-current/`.
- A request-level audit of the production build at `390x844` kept the home page idle beyond `16s` after the initial route settled. It did not request Categories, Search, Cart, Profile, or `storeRoutePreload`; later background requests were limited to analytics, tracking consent, PWA/update, Cookie consent, and browser-compatibility helpers.
- Compact touch devices now have a direct regression test for the bottom-navigation idle-preload guard, in addition to the network/device policy tests.
- Empty promotions no longer render zero-value activity dashboards.
- Empty coupons no longer render wallet/stat dashboards.
- Feature status, browsing history, help, feedback, install, and 404 now use the fixed storefront hierarchy instead of legacy dashboard/card styling.
- Notifications now use accessible flat action rows with clear unread state; the redundant category heading and decorative empty-state lines were removed.
- Download confirmation, language restriction, age confirmation, logistics, review, PWA update, Cookie preferences, compatibility notice, and fatal-error surfaces now share the fixed storefront geometry, colors, icon language, and `44px` minimum controls.
- The fixed modal system was opened in the selected in-app browser through the login country selector. The bottom sheet kept the page stable and rendered the new restrained radius, backdrop, header, close action, and spacing correctly.
- Checked public-route horizontal overflow and visible interactive targets; the audited mobile and tablet routes have no overflow. Home invitation, category load-more, cart login/quantity, and guest-profile actions now resolve to at least `44px`.
- No theme URL parameter or client theme runtime controls the fixed client.
- The storefront toast entry is fixed-light. Admin now uses an independent fixed appearance provider with its own light/dark preference; neither production bundle emits `vendor-next-themes` or requests `/theme/skins`. The dist gate rejects empty bundles, legacy skin cache/preview fragments, and future runtime regressions.
- Dead frontend skin infrastructure has been removed: runtime provider, URL/draft preview bridge, theme studio UI, admin skin client, preset skin data, and the `next-themes` dependency. Historical preset data now lives inside the server compatibility module and remains isolated for one release cycle.
- The settings route no longer imports admin translation/runtime code; its decoded JavaScript fell from about `195.7KB` to `15.6KB`.
- The admin theme entry is hidden and all theme write endpoints return the explicit retired response. Public reads return one fixed compatibility design.
- Bootstrap and API banner normalization preserve separate mobile and desktop images, and the fixed cache revision replaces stale legacy banner data.
- Responsive Banner rendering now uses picture art direction, so high-density mobile screens cannot select the desktop composition merely because of device pixel ratio.
- Banner normalization keeps valid mobile and desktop media even when an unsafe inline legacy image has been removed.
- The bundled fallback hero ships as `1472x800` and `1600x600` WebP assets at about `88KB` and `76KB`; the `1.9MB` source PNG is archived outside public assets.
- Seven business-specific category fallbacks now match the live category names instead of assigning unrelated images by array position. All use exact `1200x525` WebP media, and all 7 mappings were verified in the selected in-app browser without horizontal overflow.
- Seven production banner topics now have separate `1472x800` mobile and `1600x600` desktop WebP assets. The local fallback uses all 7, with a compact previous/current/next pager that does not cover the mobile copy panel.
- The fixed-asset audit checks 30 bundled media files for dimensions, WebP format, and file-size limits.
- Server contract tests cover the fixed public theme response, retired theme writes, responsive banner persistence, public banner sanitization, and the invariant that a Banner cannot be updated to remove every image.
- Home-navigation server guards reject invalid category and URL targets at save time. The public response independently removes stale categories, empty or unsafe URLs, disabled support channels, and support entries disabled by site capability.
- The admin shortcut-entry editor now marks enabled invalid targets as `需修复`, explains the failure, hides inactive categories from the selector, and cannot re-enable a stale target through a partial update. Its release-readiness link opens a dedicated 6-item queue containing the 5 invalid entries plus the external invitation review, while the ordinary editor retains all 10 entries.
- Product management now exposes an effective-media filter backed by the server. Missing product covers and variant images are marked directly in mobile and desktop lists, while a valid enabled variant image is shown as the repair-safe fallback.
- The admin home-operations page now opens on a read-only `发布准备` check. It aggregates responsive Banner media, category Banner review, valid home navigation, and effective home-product media, then links operators directly to each repair surface.
- Matching Banner rows can now apply the approved mobile/desktop media pair after an explicit confirmation without changing copy, link, order, or enabled state. The release-readiness link opens a dedicated 7-item queue in home display order, identifies `中文客服确认中心` as the first remaining item, and leaves the ordinary Banner route unchanged. Invalid home-navigation rows similarly expose a live-category-aware recommendation; each repair is confirmed and written through the existing validated endpoint rather than a silent bulk mutation.
- Category review links now open a 7-item top-level-category queue. The drawer shows the matching audited `1200x525` image, requires an explicit `使用推荐主图` action, and still relies on the normal category save before any data changes.
- Missing-media product links now open a dedicated operator queue with a live remaining count and direct first-item editing. Saving a real image refreshes the filtered list and readiness result; the queue never generates placeholder product media. The compliance link now opens the exact age-gate section and still requires the normal confirmed settings save.
- The real admin shell was opened through the local fixture login and visually checked in the selected in-app browser. The readiness page reported 54 blockers without horizontal overflow; the responsive-Banner queue rendered all 7 missing rows in home order with `中文客服确认中心` first and no horizontal overflow, while the ordinary Banner page showed no queue state; the shortcut queue rendered exactly 6 repair/review rows with `正品烟草` first and no horizontal overflow, while the ordinary shortcut page retained all 10 rows; the dedicated home-media queue rendered all 41 products in storefront-exposure order with `7星1` first, while the ordinary missing-media filter retained its 20-row pagination; the compliance deep link landed on `合规与访问限制` with age-gate disabled and minimum age `18`.
- The same admin pass verified the category review queue at `1280x720`: all 7 review rows were visible without horizontal overflow, the first drawer matched `签证服务` to `category-visa-hero.webp`, and cancelling after choosing the recommendation submitted no write.
- No admin fixture write was performed during this visual pass. The proof covers routing, layout, and operator affordances only; production images and compliance settings remain unchanged.
- Authenticated transaction and member-asset pages were rechecked against a dedicated in-memory fixture API at `127.0.0.1:3199`. The actual login form and session flow were used; fixture writes stay in memory, unknown writes return `405`, and only unknown `GET` / `HEAD` requests may use the read-only production bridge.
- The authenticated `1280x800` pass covered checkout, orders, order detail, logistics, returns, return detail, points, points gifts, rewards, wallet, member benefits, invite, coupons, notifications, and pending reviews. None produced horizontal overflow.
- The logistics page now uses the full desktop account content area with a status banner and balanced information/timeline columns. Notifications now consistently retain the standard desktop storefront header even when route CSS chunks load in a different order.
- Logistics and notifications were rechecked at `390x844`: desktop/tablet headers are hidden, the mobile page header is present, horizontal overflow is `0`, and every visible button is at least `44px` high.
- The final in-app-browser matrix covered 47 authenticated and public route entries at `375x667`, `390x844`, `768x1024`, `1280x800`, and `1440x900`, scanning both the top and bottom state of every route. Across 470 checks there was no horizontal overflow, visible broken image, fatal empty page, or desktop/tablet interactive overlap.
- The same matrix found and fixed a nested Banner click target, the favorite-card image/remove overlap, undersized order/coupon/return tabs, compact notification and invite actions, and the unstyled contact-channel area. The contact page now uses flat 56px contact rows, a structured service-hours row, and responsive support-channel actions.
- The TikTok standalone route now uses a real Kuala Lumpur photographic hero and expands into the fixed storefront desktop grid instead of rendering a narrow mobile canvas on wide screens.
- The profile invitation reward block now uses the fixed warm-white, ink, and tea-green palette. Cyan gradients, ornamental rings, nested mini-cards, pill actions, and colored shadows were removed.
- A final core-route pass verified no visible interactive target below `44px` on home, cart, product detail, and profile. The selected in-app browser reported no runtime error or warning.
- The strict storefront color audit now reports `0` hardcoded UI color findings. Official brand colors and generated poster artwork are isolated with explicit rationale instead of silently bypassing the gate.
- On `375x667`, the product and checkout fixed conversion bars can temporarily cover document-flow controls while those controls pass underneath during scrolling. Both pages retain dedicated bottom action space, so the covered content remains reachable; this is the approved persistent-conversion behavior rather than an unresolved layout collision.
- Authenticated fixture evidence is stored under `artifacts/fixture-auth-audit-current/`. This proves the candidate layout and local interaction states; it does not prove integration with a target environment's real payment, order, logistics, refund, or member records.

## Release blockers

- Target-environment authentication, payment, order creation, logistics, refund, and member-asset integration still need a real non-production test account and approved test data. Local fixture visual verification cannot replace that integration gate.
- Production Banner content needs separate mobile `1472x800` and desktop `1600x600` assets uploaded through the updated admin form. The read-only production audit found all 7 enabled banners still use only the legacy image field.
- Production home navigation still needs repair. Three enabled entries have no URL, and two category entries target IDs absent from the current public category response. The candidate server hides these dead actions, but it does not silently change production configuration.
- Production category banners need editorial approval. All 7 visible top-level categories currently have custom banners disabled or empty; the candidate therefore uses its reviewed business-specific fallbacks.
- Production catalog media is not ready: 41 of 48 unique home products in the current bootstrap response have no effective cover/default-variant image.
- Browser overlap and route-transition scripts use a separate Playwright runtime. They were not run because this QA session is constrained to the user-selected in-app browser.
- Exact `4x CPU` long-task timing is not independently verified by the selected in-app browser; the CSS budget, lazy route chunks, real-data interaction flow, and static performance guards have been verified.
- The selected in-app browser exposes neither CPU throttling nor `PerformanceObserver`, so native browser interaction must not be presented as equivalent evidence. The repository's dedicated `audit:storefront-performance` script remains the authoritative 4x-CPU gate and requires explicit approval to use its separate Playwright runtime.
- Theme service code and the `theme_skins` / `theme_preview_drafts` data remain as a one-release-cycle compatibility layer. Their phase-two removal happens only after the fixed client is released and observed stable.
- Core, authentication, public-content, transaction, after-sales, and member-asset routes now have dedicated desktop composition or an explicit fixture-backed visual pass. The remaining account-route blocker is real target-environment workflow integration, not an unresolved local layout.

## Passed checks

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run build:admin`
- `npm run test:browser-compat`
- `npm run verify:pwa`
- `npm run check:client-redesign-scope`
- `npm run theme:check`
- `npm run audit:fixed-assets` (`30/30` media files)
- `npm run release:client-redesign` (`13/13` static release gates)
- `npm run test:client-redesign-contract` (`21/21` files, `61/61` tests)
- `git diff --check`
- Frontend `114/114` test files and `455/455` tests
- Server typecheck, `403/403` unit tests, migration check, and architecture check

The latest storefront production build emits about `218.7KB` decoded initial/shared CSS (`index`, route Tailwind, route primitives, and StoreApp CSS combined), back inside the original `200–220KB` fixed-client budget. The reduction removed a superseded duplicate tablet-navigation block; route structure and controls were retained.

## Release policy

- No commit, push, merge, deployment, production skin switch, or destructive theme-data migration before user approval.

## Phase 2 feedback closure (2026-07-30)

### Source and comparison evidence

- User feedback was grounded in six supplied screenshots covering category empty state, category product-row alignment, sticky category sorting, product-detail sticky navigation, home activity-card density, search discovery, and cart whitespace.
- Matching `390x844` before/after comparison sheets are stored in `artifacts/phase2-user-feedback-20260730/compare-*.png`.
- Additional evidence covers the category empty state, the scrolled category state, mobile product detail, `375x667`, and desktop `1280x800`.

### Findings and fixes

- Category product media and copy now resolve to the same `96px` content height on mobile. Titles may use two lines; price and the `44px` add action remain anchored to the bottom.
- The category toolbar and workspace meet at the same boundary. When the banner scrolls away, the solid sort bar sticks directly beneath the search toolbar without a visual gap.
- Filtered or empty categories now show a structured icon, explanation, and a clear recovery action instead of a plain bordered message.
- Product-detail navigation keeps immersive controls over the hero and switches to a fully opaque surface after scrolling. The sticky search launcher and drawer were removed from this route.
- Product-card media uses one clipping surface. The outer rounded frame plus inset square-image treatment was removed from grid cards.
- Mobile compact shelves now use a readable horizontal product rail with larger media, continuous title-to-price hierarchy, and no visible scrollbar.
- Search discovery always follows hot terms and recent browsing with real-image recommendations, preventing the large unfinished blank area.
- Populated and empty carts now continue into a compact recommendation list. The existing top-right selection control and left-aligned checkout total are preserved.

### Browser verification

- `390x844`: category normal, category scrolled, category empty, search discovery, product top/scrolled, cart, and home activity shelf.
- `375x667`: category, cart, search, and product detail.
- `1280x800`: category, cart, search, product detail, and home.
- All checked routes reported zero horizontal overflow and zero completed broken images.
- Category mobile media height: `96px`; category copy height: `96px`.
- Product sticky solid background: `rgb(254, 254, 252)`; sticky search element count: `0`.
- Cart recommendation rows: `3`.

### Result

passed

## Phase 1 visual acceptance (2026-07-30)

- The selected in-app browser completed 65 route/viewport checks across `375x667`, `390x844`, `768x1024`, `1280x800`, and `1440x900`, scanning both the top and bottom of 13 representative storefront routes. Failures: `0`.
- A separate mobile touch-target pass completed 26 top/bottom checks at `375x667` and `390x844`. Visible interactive targets below `44px`: `0`.
- Normal-state fixture coverage now includes category, product, promotion, flash-sale, and home-campaign responses. The seven square product images under `scripts/fixtures/fixed-client-assets/` are local QA media only and are never production catalog substitutes.
- Category switching, category filters, cart select-all, product sticky-header transition, and order overflow actions were exercised in the selected in-app browser.
- The pass fixed a desktop profile notification badge that escaped its service row and removed the order overflow trigger when an order has no additional actions.
- Screenshots are stored in `artifacts/phase1-visual-audit-20260730/`, including verified mobile and desktop captures for the core shopping, transaction, settings, and member-asset routes.
- `npm run release:client-redesign` passed all `13/13` static release gates in `29.4s`. Its optional browser-script stage was not enabled because `BASE_URL` was omitted; the in-app-browser matrix above is the visual evidence for this local phase.
- This acceptance proves the local candidate design and fixture-backed interactions only. It does not prove target-environment payment, order, logistics, refund, member-data integration, production content readiness, deployment, or release.

## Phase 3 feedback closure (2026-07-30)

- The profile member summary now has one identity hierarchy: account name and level remain in the header, and the duplicated lower `会员权益 / 普通会员` row was removed without removing the member-benefits entry.
- The invitation reward block now uses a stable top data row, copy-and-image row, and aligned three-action row. The illustration no longer overlaps the description or action controls.
- Order cards now keep item count, paid total, overflow action, and primary actions in one aligned footer row. Secondary after-sale and logistics operations remain available through `更多`, so mobile rows do not overflow.
- Mobile order search is now a 44px header icon. The full-width search field appears only on request; closing it clears the hidden keyword filter.
- The fixed storefront now provides a complete shared base style for route empty, error, and search states. The order empty state no longer renders as raw icon/text/button content.
- The supplied screenshots and fixed implementation were reviewed together in `artifacts/design-qa/feedback-comparison.png`.
- Browser interaction verified search open, keyword URL sync, clear/close behavior, pending-payment actions, shipped actions, completed actions, and the order overflow sheet. Console errors and warnings: `0`.
- `npm run release:client-redesign` passed all `13/13` static release gates in `31.2s`; its optional separate browser stage remained disabled because `BASE_URL` was not supplied.
- This closure applies to the local candidate only. No commit, deployment, or production switch was performed.
