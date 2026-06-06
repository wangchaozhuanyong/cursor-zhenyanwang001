# Security Checklist (Pre-Release)

Last updated: 2026-06-06

## 1. Dependency vulnerability check

Executed:

1. `server`: `npm audit --omit=dev --json` -> vulnerabilities total: `0`
2. `frontend`: `npm audit --omit=dev --json` -> vulnerabilities total: `0`

Note: rerun these checks before each production release.

CI gate:

1. Frontend CI runs `npm audit --omit=dev` after `npm ci`.
2. Backend CI runs `npm audit --omit=dev` after `npm ci`.

## 2. Sensitive data in repository (quick scan)

Findings:

1. No tracked `server/.env` or private key file in git index.
2. Placeholder examples exist in `.env.example` and docs/scripts (`REPLACE_ME`, `CHANGE_ME`) and are expected.
3. No obvious AWS access key / private key block found in tracked source scan.

Required manual gate:

1. Validate CI secrets and server `.env` are not leaked in logs.
2. Confirm no real credentials in release notes or screenshots.

Automated gate:

1. CI runs `node scripts/check-secret-leaks.mjs` against git-tracked files.
2. The scan blocks high-confidence private keys, cloud/API tokens, and hardcoded default admin credentials.

## 3. SAST and static source-risk scan

Automated gate:

1. CI runs `node scripts/check-static-security.mjs` against git-tracked source files.
2. Local verification scripts also run the same gate before deeper build/test checks.
3. The scan blocks high-confidence risky patterns: global `eval`, `new Function`, unsanitized `dangerouslySetInnerHTML`, direct `child_process.exec`, and hardcoded default admin credentials.
4. `Security CodeQL SAST` runs GitHub CodeQL for JavaScript/TypeScript with `security-extended` and `security-and-quality` queries.

Remaining manual gate:

1. Review CodeQL alerts in GitHub code scanning before merging security-sensitive changes.

## 4. Dynamic security baseline (DAST)

Latest executed result:

1. `node scripts/check-dast-local.mjs` passed locally on 2026-06-06.
2. Authorized production baseline passed for `https://damatong.net` on 2026-06-06.
3. Authorized production baseline passed for `https://console.damatong.net` on 2026-06-06.
4. GitHub Secrets were configured on 2026-06-06 for recurring approved production baseline scans.

Automated gate:

1. Local verification runs `node scripts/check-dast-local.mjs`, which starts the Express app and executes the baseline against `127.0.0.1`.
2. `Security DAST Baseline` runs `node scripts/check-dast-baseline.mjs` on schedule and manual dispatch for staging or another approved external target.
3. Strict workflow mode requires `DAST_BASE_URL`; the external target check is skipped locally when no target is configured.
4. The baseline checks health/security headers, anonymous access rejection, admin Origin/CSRF blocking, unsigned payment webhook rejection, and encoded upload path traversal rejection.

Required configuration:

1. Configure GitHub Secrets: `DAST_BASE_URL`, `DAST_ADMIN_BASE_URL`, `DAST_ALLOWED_HOSTS`, and optionally `DAST_ADMIN_ORIGIN`, `DAST_AUTH_HEADER`, `DAST_COOKIE`.
2. Use staging or an approved test target. Do not point this workflow at production without explicit approval.
3. Production hosts are refused unless `DAST_PRODUCTION_ACK=I_UNDERSTAND_THIS_IS_PRODUCTION` is explicitly set.

## 5. CORS policy check

Current implementation: `server/src/app.js` + `server/src/config/validateEnv.js`

Status:

1. CORS uses explicit allow-list (`CORS_ORIGINS`), not wildcard.
2. Production validation blocks `*`, blocks placeholders, blocks `localhost/127.0.0.1`.
3. Credentials mode is enabled intentionally for cookie auth.

## 6. Authentication and authorization baseline

Status:

1. User routes use auth middleware for protected endpoints.
2. Admin routes use `adminAuth` + RBAC permission checks.
3. Sensitive routes have rate limiting (`auth`, `upload`, `webhook`).

Manual verification needed:

1. Re-run unauthorized access smoke checks after each major route change.

## 7. Upload security baseline

Status:

1. Upload requires authenticated user/admin.
2. File type allow-list (image/video MIME + extension checks).
3. Magic-byte validation enabled (`bufferMatchesDeclaredMime`).
4. Size limits: image 15MB, video 50MB; batch upload count capped.
5. Image dimension guard enabled (max pixel threshold).

## 8. Admin endpoint exposure risk

Status:

1. `/api/admin/*` routes are guarded by admin auth and permissions.
2. No intentionally anonymous admin route found in current router.

## 9. Release-day security steps

1. Re-run `npm audit --omit=dev` in backend and frontend.
2. Run access smoke tests for anonymous user vs user vs admin roles.
3. Confirm production `.env` secrets are rotated and not default.
4. Confirm backup and rollback paths are available before rollout.

## 10. Evidence references

1. Auth/cors/helmet/rate-limit: `server/src/app.js`
2. Production env guard: `server/src/config/validateEnv.js`
3. Upload guards: `server/src/modules/user/controller/upload.controller.js`, `server/src/modules/user/service/uploadMedia.service.js`
4. Admin RBAC routes: `server/src/modules/admin/routes/admin.routes.js`
