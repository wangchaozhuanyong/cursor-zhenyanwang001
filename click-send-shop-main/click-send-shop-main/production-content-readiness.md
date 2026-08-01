# Production Content Readiness

Read-only production audit target: `https://damatong.net`

This checklist is operational evidence only. The candidate branch does not write to production.

## Release blockers

### Home banners

- Current production has 7 enabled banners.
- All 7 only expose the legacy `image` field.
- Before release, each retained banner needs:
  - Mobile image: `1472x800` WebP, `390:212`.
  - Desktop image: `1600x600` WebP, `8:3`.
  - Important subjects inside the center safe area.
  - No baked-in button, QR code, price, or dense small copy.
- The updated admin form previews both slots, warns about a wrong ratio or low resolution, and can enforce strict ratio checking.
- The candidate now includes upload-ready mobile and desktop assets for all 7 current banner topics.
- The exact title, link, order, and asset mapping is recorded in `docs/production-home-banners.json`.
- A matching legacy banner row now exposes `使用推荐双图`. The operator sees a confirmation first; applying it changes only `image_mobile` and `image_desktop` while preserving title, link, order, and enabled state.
- Opening Banner management from `发布准备` now enters a dedicated 7-item responsive-media queue. It follows the current home display order, identifies the first remaining Banner, and keeps the ordinary Banner management route unchanged.
- Applying a recommendation or uploading responsive media refreshes both the Banner list and the release-readiness result. The queue still requires an explicit confirmation and never performs a bulk write.
- These files are active in the local fixed-client fallback, but they have not been written to production.

### Category banners

- Current production has 7 visible top-level categories.
- All 7 currently have custom category banners disabled or empty.
- The candidate includes business-specific `1200x525` fallbacks for:
  - Visa service.
  - Snacks and drinks.
  - Second Home consultation.
  - Study application service.
  - Commercial renovation.
  - Wine and spirits.
  - Tobacco.
- These fallbacks make the candidate coherent, but final production category images still need editorial approval in the admin.
- Opening category management from `发布准备` now enters a dedicated review queue for the 7 public top-level categories. Each row opens the matching audited `1200x525` recommendation, but the operator must explicitly choose `使用推荐主图` and then save the category.
- Cancelling the drawer discards the recommendation. The queue never performs a silent or bulk category update.

### Home navigation

- Current production has 10 enabled home navigation entries.
- The following entries have no usable URL: `床上用品`, `第二家园`, `留学办理`.
- `正品烟草` and `签证办理` point to category IDs that are not present in the current public category response.
- The generated repair plan resolves four entries to current category IDs:
  - `正品烟草` -> `正品烟草`.
  - `签证办理` -> `签证服务`.
  - `第二家园` -> `第二家园`.
  - `留学办理` -> `留学办理`.
- `床上用品` has no supported category and should be disabled until the platform has a real destination.
- `邀请返现` currently leaves the site for `flashcast.com.my`; the existing client route `/invite` is recorded as the recommended destination for owner review.
- Every enabled entry must resolve to a valid category, supported customer-service channel, or valid URL before release.
- The candidate server now rejects new or edited navigation entries that target a missing, inactive, or hidden category.
- The public home response now omits stale category targets, empty or unsafe URL targets, disabled support channels, and support targets whose site capability is disabled.
- The admin shortcut-entry list labels every enabled invalid target as `需修复`, shows the exact reason, and excludes inactive or hidden categories from the destination selector.
- Known invalid rows now expose a per-item recommendation after the live category list has been loaded: four rows connect to the current category IDs, `床上用品` is disabled until it has a real destination, and the external invitation row can be changed to `/invite`.
- Opening shortcut management from `发布准备` now enters a dedicated 6-item queue: the 5 invalid enabled entries plus the external invitation entry that requires owner review. It preserves the current home order and hides unrelated valid entries until the operator exits the queue.
- Every recommendation opens an explicit confirmation dialog and uses the existing validated update endpoint. There is no silent bulk write.
- This defensive filtering prevents dead client actions, but it does not silently repair the production navigation configuration. The five invalid entries still require the admin changes listed in `docs/production-content-repair-plan.json`.

### Product media

- The production home bootstrap currently exposes 48 unique products.
- 41 do not have an effective cover image in `cover_image`, `image_url`, or the default variant image.
- The generated repair plan orders those 41 products by storefront visibility:
  - `P0`: 5 products in the first 8 hot-product positions.
  - `P1`: 16 products in the next hot positions or first 8 recommendations.
  - `P2`: 20 remaining home products.
- The detail-level audit checked every one of those 41 products against the public product endpoint.
- All 41 are genuinely missing media: no cover, gallery image, variant image, specification image, or detail image can be recovered.
- The exact detail-level evidence is recorded in `docs/production-product-media-depth.json`.
- The fixed client shows a stable missing-image state, but that is not a production-quality substitute for real catalog photography.
- Product media review must prioritize every product shown in new arrivals, recommendations, and hot products.
- Product management now has an `图片正常 / 缺商品图` filter. It treats either a product cover or an enabled variant image as effective media, shows the usable variant fallback in the list, and marks truly missing rows as `缺商品图`.
- Opening product management from `发布准备` now enters a dedicated home-product repair queue. It loads all 41 current home-media gaps in one view, follows the storefront exposure order, opens the highest-priority item directly, labels the drawer as image repair, and removes a repaired item from the queue after the real image is saved.
- The ordinary `缺商品图` filter remains a separate paginated all-catalog view. It is not narrowed or reordered by the release-readiness queue.
- The repair queue never creates placeholder catalog media or performs a bulk write. Each product still requires an operator to upload and save a genuine image.
- The filtered result can be exported, so the repair list can be handed to content operations without scanning unrelated products.

### Public product data

- The detail-level production audit also confirmed that the current public product response exposes internal inventory controls and variant commercial fields, including `cost_price` and `barcode`.
- The candidate server now excludes those fields at both the database projection and public serializer layers.
- The same public product contract is now used by cart, favorites, and browsing history, so internal stock thresholds cannot reappear through account routes.
- Customer order responses no longer expose item cost, logistics cost, payment fee, gross profit, or net profit. Admin order details retain those operational fields through a separate admin-only formatter.
- `test/catalog-public-contract.test.js` and `test/public-customer-data-contract.test.js` protect product, cart, favorites, history, and customer-order responses from regressing.
- Production remains exposed until the candidate server change is explicitly approved and deployed.

### Restricted-product compliance

- Production exposes two restricted catalog categories: `正品烟草` and `正品酒水`.
- The current public site configuration has `ageGateEnabled=0` while the configured minimum age is `18`.
- This is now a release blocker because the existing product-purchase confirmation intentionally follows the site age-gate setting.
- The candidate product-detail response now includes `category_name`, so short product names such as `7星1` still inherit the restricted-category behavior.
- `首页装修 -> 发布准备` now reports the disabled age gate and links directly to the `合规与访问限制` settings section; it remains read-only.
- The operator must turn on the existing age-gate switch and confirm the normal settings save action. No compliance value is changed automatically.
- Before release, enable the site age gate, confirm the intended minimum age and compliance copy, then re-run the strict production audit.

### Admin release readiness

- `首页装修 -> 发布准备` now performs the same content-readiness model against the current site data.
- It is a read-only check and does not alter Banner, category, navigation, or product records.
- The page separates release blockers from editorial review items:
  - Missing mobile/desktop Banner media is blocking.
  - Invalid enabled home navigation is blocking.
  - Missing effective media on products currently selected for the home page is blocking.
  - A disabled age gate while restricted categories are public is blocking.
  - Category fallback replacement and external navigation destinations require review.
- Every row links directly to the relevant repair surface. The category action opens the 7-item category-main-image review queue, the product action opens the missing-media repair queue, and the compliance action opens the exact age-gate settings section.
- The linked Banner and shortcut-entry pages now provide owner-confirmed repair actions for the 7 approved Banner pairs and the 5 known invalid navigation rows. The readiness check itself remains read-only.
- Refreshing the check reads only the five relevant public content domains; it does not load payment, campaign, coupon, or member data.

## Candidate-side checks

- `npm run audit:fixed-assets` verifies 30 bundled fixed-client images:
  - Exact dimensions.
  - WebP format.
  - File-size budget.
- `npm run audit:production-content -- https://damatong.net` performs the read-only production content audit.
- Add `--output=docs/production-content-repair-plan.json` to refresh the exact local repair plan with current IDs, recommended navigation targets, product positions, and media priorities.
- `npm run audit:production-product-media -- https://damatong.net --output=docs/production-product-media-depth.json` checks every missing home product for gallery, variant, specification, and detail media without writing production data.
- Add `--strict` when the production content has been repaired; any remaining release blocker then fails the command.
- `npm --prefix ../../server run verify:fixed-client` covers the fixed-theme compatibility response, responsive Banner contract, home-navigation target validation/filtering, public product and customer-order privacy, and age-gate readiness.

## Approval sequence

1. Repair Banner, category, navigation, product media, and restricted-product age-gate configuration in the non-production or production admin as approved.
2. Confirm `首页装修 -> 发布准备` has no blocking items.
3. Re-run the production content audit in strict mode.
4. Recheck home and all 7 categories at mobile and desktop viewports.
5. Re-run the completed fixture-backed account-route visual pass with a real non-production test account in the target environment, including payment, order, logistics, refund, and member-state transitions.
6. Obtain explicit release approval before commit, merge, or deployment.
