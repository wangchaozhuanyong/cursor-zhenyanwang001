# DAST Baseline

Last updated: 2026-06-06

This repository includes a minimal dynamic security baseline in:

1. `scripts/check-dast-local.mjs` for local runtime checks.
2. `scripts/check-dast-baseline.mjs` for staging or another approved external target.

## What It Checks

1. `/api/health/live` responds and includes baseline security headers.
2. Anonymous `/api/user/profile` is rejected.
3. Anonymous `/api/upload` is rejected before file parsing.
4. Mutating `/api/admin/products` is blocked without Origin/CSRF.
5. Admin login blocks forged Origin.
6. Manual payment webhook rejects unsigned payloads.
7. Encoded path traversal under `/uploads` is not served.

## Latest Authorized Production Baseline

On 2026-06-06, production baseline DAST was run after explicit approval with
`DAST_PRODUCTION_ACK=I_UNDERSTAND_THIS_IS_PRODUCTION`.

Passed targets:

1. `https://damatong.net`
2. `https://console.damatong.net`

Both targets passed all 7 baseline checks.

## Local Usage

Run against a temporary local Express server:

```powershell
node scripts/check-dast-local.mjs
```

Run against an already-started local server:

```powershell
$env:DAST_BASE_URL = "http://127.0.0.1:3000"
node scripts/check-dast-baseline.mjs
```

`node scripts/verify-all.mjs` runs `check-dast-local.mjs` automatically. It then runs the external baseline too; without `DAST_BASE_URL`, the external target check is skipped.

## CI Usage

The `Security DAST Baseline` workflow runs in strict mode. Configure these GitHub Secrets:

1. `DAST_BASE_URL`: staging API/site base URL.
2. `DAST_ADMIN_BASE_URL`: admin staging/site base URL when the workflow should scan a separate admin host.
3. `DAST_ALLOWED_HOSTS`: comma-separated allowed hostnames.
4. `DAST_ADMIN_ORIGIN`: admin staging Origin, if different from `DAST_BASE_URL`.
5. `DAST_AUTH_HEADER`: optional authenticated probe header.
6. `DAST_COOKIE`: optional authenticated probe cookies.
7. `DAST_PRODUCTION_HOSTS`: optional comma-separated production host deny-list.
8. `DAST_PRODUCTION_ACK`: set to `I_UNDERSTAND_THIS_IS_PRODUCTION` only for an approved production scan.

Use staging or another approved test target. Production DAST requires explicit approval and a rollback/monitoring window.
