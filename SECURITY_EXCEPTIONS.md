# Security Exceptions Register

Last updated: 2026-06-06

This file tracks accepted temporary security gaps that are not fully closed yet.

## EX-001: DAST staging target not configured yet

- Status: Partially mitigated on 2026-06-06; code-side SAST/DAST plumbing is in place.
- Risk: dynamic security regressions may pass if the scheduled DAST job has no staging target to scan.
- Reason: the repository does not contain the staging base URL or scan authorization secrets.
- Temporary mitigation:
  1. Mandatory code review for security-sensitive modules (`auth`, `payment`, `upload`, `admin`).
  2. Manual pre-release security checklist execution (`docs/SECURITY_CHECKLIST.md`).
  3. Rate limiting + RBAC + input validation remain enabled in runtime.
  4. CI and local verification now run `node scripts/check-static-security.mjs` for high-confidence risky source patterns.
  5. CodeQL SAST workflow runs on PR/push/schedule.
  6. DAST baseline workflow exists and fails in strict mode until `DAST_BASE_URL` is configured.
- Planned fix:
  1. Configure GitHub Secrets: `DAST_BASE_URL`, `DAST_ALLOWED_HOSTS`, and optionally `DAST_ADMIN_ORIGIN`, `DAST_AUTH_HEADER`, `DAST_COOKIE`.
  2. Run `Security DAST Baseline` successfully against staging.
- Current remaining gap:
  1. No real staging DAST result has been produced in this workspace because no staging target URL/authorization was provided.
  2. Production domains were found in repo docs/config, but production DAST is intentionally refused unless explicitly acknowledged.
- Owner: Engineering Lead / Security Owner
- Target date: 2026-06-15

## EX-002: Repository-native secret scanning gate enforced in CI

- Status: Closed on 2026-06-06.
- Previous risk: accidental credential commit may not be blocked automatically.
- Fix:
  1. Added `scripts/check-secret-leaks.mjs`.
  2. Added the scanner to CI repo hygiene.
  3. Added the scanner to local `scripts/verify-all.mjs` and `scripts/verify-before-push.ps1`.
- Remaining manual gate:
  1. Store all production secrets in secure vault / GitHub Secrets only.
  2. Confirm CI/deploy logs do not print real secret values.
- Owner: DevOps Owner
- Closed date: 2026-06-06

## EX-003: Observability alerts currently script-driven, not yet unified in managed alert platform

- Risk: delayed detection/escalation if operators do not run checks continuously.
- Reason: project has baseline health script and runbooks, but managed alert routing is not fully codified in repo.
- Temporary mitigation:
  1. Use `deploy/check-production-health.sh` as release gate and periodic cron check.
  2. Keep on-call escalation in release war room.
- Planned fix:
  1. Integrate health metrics and alert routing to one platform (CloudWatch/Prometheus/Grafana/etc).
- Owner: SRE/Ops Owner
- Target date: 2026-06-20
