# DAST Baseline

Last updated: 2026-06-06

This repository includes a minimal dynamic security baseline in `scripts/check-dast-baseline.mjs`.

## What It Checks

1. `/api/health/live` responds and includes baseline security headers.
2. Anonymous `/api/user/profile` is rejected.
3. Anonymous `/api/upload` is rejected before file parsing.
4. Mutating `/api/admin/products` is blocked without Origin/CSRF.
5. Admin login blocks forged Origin.
6. Manual payment webhook rejects unsigned payloads.
7. Encoded path traversal under `/uploads` is not served.

## Local Usage

```powershell
$env:DAST_BASE_URL = "http://127.0.0.1:3000"
node scripts/check-dast-baseline.mjs
```

Without `DAST_BASE_URL`, local verification scripts skip this check.

## CI Usage

The `Security DAST Baseline` workflow runs in strict mode. Configure these GitHub Secrets:

1. `DAST_BASE_URL`: staging API/site base URL.
2. `DAST_ALLOWED_HOSTS`: comma-separated allowed hostnames.
3. `DAST_ADMIN_ORIGIN`: admin staging Origin, if different from `DAST_BASE_URL`.
4. `DAST_AUTH_HEADER`: optional authenticated probe header.
5. `DAST_COOKIE`: optional authenticated probe cookies.
6. `DAST_PRODUCTION_HOSTS`: optional comma-separated production host deny-list.
7. `DAST_PRODUCTION_ACK`: set to `I_UNDERSTAND_THIS_IS_PRODUCTION` only for an approved production scan.

Use staging or another approved test target. Production DAST requires explicit approval and a rollback/monitoring window.
