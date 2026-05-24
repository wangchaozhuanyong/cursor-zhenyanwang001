# server/src/modules Architecture

The backend is a modular monolith. All business APIs are mounted under `/api`, and every new backend change must first decide module ownership, then layer ownership.

## API Contract

- Public APIs: `/api/*`
- Admin APIs: `/api/admin/*`
- Health checks: `/api/health/live` and `/api/health/ready`

## Fixed Backend Modules

The current fixed module list is the actual directory list under `server/src/modules`:

1. `admin`
2. `analytics`
3. `auth`
4. `cart`
5. `dataRetention`
6. `health`
7. `home`
8. `logistics`
9. `loyalty`
10. `marketing`
11. `monitoring`
12. `myinvois`
13. `notification`
14. `order`
15. `payment`
16. `privacy`
17. `product`
18. `pwa`
19. `search`
20. `seo`
21. `siteCapabilities`
22. `telegram`
23. `theme`
24. `user`

## Required Module Structure

Every module must contain these layer directories:

- `routes/`
- `controller/`
- `service/`
- `repository/`

Optional directories such as `schemas/` are allowed when needed. Existing domain support directories such as `jobs/`, `rules/`, `adapters/`, and `providers/` are historical or domain support areas; new request/response, business, and data-access code must still go into the standard layer.

## Layer Rules

- `routes`: route and middleware binding only; no business logic and no SQL.
- `controller`: receive request parameters, call service, and return responses only; no business logic, SQL, or direct repository calls.
- `service`: business rules, state transitions, and orchestration only; no direct SQL or direct `config/db` dependency.
- `repository`: database access only; no business decisions and no HTTP response shape.

## Cross-Module Rules

- Prefer module public APIs exposed by each module entrypoint.
- Do not import another module's internal controller, service, or repository directly.
- Cross-module writes must be explicitly orchestrated in the owning service layer.
- Avoid circular dependencies.

## Refactor Rules

- Do structural refactors only; do not change business behavior.
- Do not change API paths, database fields, or core order, inventory, and payment logic during structural cleanup.
- After backend structure changes, run:
  - `npm run check:module-structure`
  - `npm run check:service-layer`
  - `npm run audit:module-boundaries`

Use `npm run check:module-boundaries` only when the legacy cross-module import list has been cleared; strict mode is intentionally available but not yet part of the normal gate.
