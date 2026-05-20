# Security Exceptions Register

Last updated: 2026-05-19

This file tracks accepted temporary security gaps that are not fully closed yet.

## EX-001: No automated SAST/DAST pipeline gate in CI

- Risk: code-level security issues may pass without automated static/dynamic security test gates.
- Reason: current CI focuses on typecheck/build/unit tests and deployment readiness.
- Temporary mitigation:
  1. Mandatory code review for security-sensitive modules (`auth`, `payment`, `upload`, `admin`).
  2. Manual pre-release security checklist execution (`docs/SECURITY_CHECKLIST.md`).
  3. Rate limiting + RBAC + input validation remain enabled in runtime.
- Planned fix:
  1. Add SAST (for example Semgrep/CodeQL) in CI.
  2. Add periodic DAST against staging.
- Owner: Engineering Lead / Security Owner
- Target date: 2026-06-15

## EX-002: No repository-native secret scanning gate enforced in CI

- Risk: accidental credential commit may not be blocked automatically.
- Reason: repository currently relies on `.gitignore`, manual review, and environment variable discipline.
- Temporary mitigation:
  1. Manual grep scan before release.
  2. Store all production secrets in secure vault / GitHub Secrets only.
- Planned fix:
  1. Add secret scanning action (gitleaks or equivalent) as required CI check.
- Owner: DevOps Owner
- Target date: 2026-06-15

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

