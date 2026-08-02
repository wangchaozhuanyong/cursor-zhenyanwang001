# Chinese City Life Client Design QA

## Scope

- Visual target: the selected third concept, "华人城市生活入口".
- Reference: `/Users/wangchao/.codex/generated_images/019f1c38-47cc-7da1-898b-dc96923d7844/call_bCwlDlUfQcZwkcPQfCX7jqNv.png`.
- Local preview: `http://127.0.0.1:4174/`.
- Client scope only. Admin, database, payment, public API, and production are unchanged.

The storefront now uses one fixed city-life design system. It keeps existing public data and business routes, hides unsupported city selection, scanning, adviser booking, file upload, and unsupported service claims, and does not add fake actions.

## Same-Viewport Comparison

- Normalized reference at `390x844`: `design-qa/source-city-life-home-390x844.png`.
- Implementation at `390x844`: `design-qa/implementation-home-390x844-final.png`.
- Combined comparison: `design-qa/compare-home-390x844-final.png`.
- Result: PASS for the selected mobile-home structure and visual direction.

The implementation preserves the selected concept's compact brand/search header, one photographic service hero, two primary "办服务 / 买好物" choices, trust row, dense content sections, jade actions, coral-red prices, and five-item bottom navigation. Intentional differences are the real brand mark and existing platform content. Unsupported city, scan, booking, and unverified promise controls are omitted.

## Route Coverage

- Mall: home, categories, search, product detail, promotions, promotion detail, and cart.
- Transaction: checkout, payment result, orders, order detail, logistics, returns, return detail, and pending reviews.
- Account: guest/member profile, settings, address, favorites, history, and notifications.
- Assets: benefits, coupons, points, points shop, rewards, cashback/wallet, and invite.
- Service/content: support and PWA install, help, delivery, about, feedback, CMS, feature status, TikTok, unavailable, and 404.
- Authentication: login, register, forgot password, and phone binding.

Shared page shells, buttons, cards, images, prices, forms, empty/error/loading states, confirmation surfaces, and timelines inherit the fixed tokens. Mobile uses the five-item bottom navigation; desktop keeps the compact top navigation and content grid.

## Responsive And Interaction Review

- Automated overlap matrix: `375x667`, `390x844`, `768x1024`, `1280x800`, and `1440x900`.
- Coverage: 37 public routes, 40 route-style passes, and 3 scroll modes.
- Result: `issueCount: 0`; no detected horizontal overflow, overlap, or bottom-navigation coverage.
- Primary mobile controls and route actions use a `44px` minimum target. A manual screenshot review additionally found and fixed compressed promotion labels that the geometry audit did not detect.
- Route transition audit: PASS with no issues. Mobile categories, promotions, cart, profile, search, and home were `0`; the highest observed CLS was `0.0253` on desktop categories.

## Performance

Production preview at `390x844`, 4x CPU, service workers blocked:

- Initial decoded JavaScript: `455.8KB` (`480KB` budget).
- Initial decoded CSS: `243.9KB` (`250KB` budget).
- Idle route preload after 16 seconds: `0KB` JavaScript and `0KB` CSS.
- Final cold-run long tasks: 1, maximum `91ms`, total blocking `41ms`; an earlier repeat measured `60ms`, so this remains below the `110ms` regression budget but above the `80ms` optimization target on the slower run.
- Promotions-to-cart transition: `281.4ms` (`300ms` budget).
- Shared decoded CSS: `197.20KB`, within the local `200KB` baseline.

## Honest Boundaries

- The local API health endpoint currently returns unavailable/502. Public guest, loading, empty, error, navigation, and protected-route login fallback states were verified; real authenticated customer, inventory, checkout, payment, order, logistics, and after-sales data states were not manually verified in the in-app browser.
- The storefront no longer fetches or applies client skins. The admin theme editor and server-side skin data remain temporarily as rollback protection and must only be removed after visual acceptance, as required by the plan.
- Larger lazy route CSS remains in profile, legacy storefront, secondary routes, cart, product detail, and categories. It is deferred cleanup, not shared initial CSS.
- Historical full-repository theme scanning still reports 552 existing hardcoded-color findings. The redesign's incremental theme check passes and adds none.
- `npm run release:client-redesign`: PASS, 10/10 static release gates in `28.9s`. The browser gate was intentionally run separately against the local preview because `BASE_URL` was unset for the static gate.
- No commit, deployment, production switch, API change, database change, or payment change was performed.
