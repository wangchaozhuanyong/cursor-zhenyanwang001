# Pull Request Checklist

## Task type:

Select all that apply:

- [ ] backend
- [ ] frontend
- [ ] ui/ux
- [ ] api
- [ ] database
- [ ] security
- [ ] deployment
- [ ] docs
- [ ] ci/checks

## Docs read:

Select the docs actually read for this PR:

- [ ] `AGENTS.md`
- [ ] `docs/ARCHITECTURE.md`
- [ ] `docs/WEBSITE_ARCHITECTURE.md`
- [ ] `docs/FRONTEND_ARCHITECTURE.md`
- [ ] `docs/DESIGN_SYSTEM.md`
- [ ] `docs/API_CONTRACTS.md`
- [ ] `docs/DATA_CONSISTENCY_AND_CONCURRENCY.md`
- [ ] `docs/SECURITY_GOVERNANCE.md`
- [ ] `docs/QUALITY_GATES.md`

## Architecture checks:

- [ ] Correct module identified
- [ ] Correct layer identified
- [ ] No cross-module internal import
- [ ] Controller/service/repository/routes responsibilities preserved
- [ ] Not applicable

## Frontend checks:

- [ ] Correct app scope: public/admin
- [ ] API request layer used
- [ ] loading/error/empty handled
- [ ] no frontend-only business rule
- [ ] Not applicable

## Security checks:

- [ ] Admin API protected
- [ ] no frontend-only permission
- [ ] no sensitive data exposure
- [ ] Not applicable

## Data checks:

- [ ] idempotency considered
- [ ] duplicate submit considered
- [ ] concurrency risk considered
- [ ] cache invalidation considered
- [ ] Not applicable

## UI/UX checks:

- [ ] responsive checked
- [ ] accessibility considered
- [ ] no unrelated UI/content changes
- [ ] Not applicable

## Verification:

Commands run:

- [ ] `arch:check`
- [ ] `lint`
- [ ] `typecheck`
- [ ] `test`
- [ ] `build`
- [ ] other checks:

Commands not run and reason:

```text

```

## User confirmation:

- Business rule changed: yes / no
- API response changed: yes / no
- Database changed: yes / no
- UI/content changed: yes / no

## Notes

```text

```
