# Backend Module Baseline

This backend uses a modular monolith with strict layering.

## Fixed Module List

The backend module boundary is fixed to these 24 modules under `src/modules`.
This list is the source of truth for deciding module ownership before writing code:

1. admin
2. analytics
3. auth
4. cart
5. dataRetention
6. health
7. home
8. logistics
9. loyalty
10. marketing
11. monitoring
12. myinvois
13. notification
14. order
15. payment
16. privacy
17. product
18. pwa
19. search
20. seo
21. siteCapabilities
22. telegram
23. theme
24. user

## Required Layer Structure (for every module)

- `routes/`
- `controller/`
- `service/`
- `repository/`

Optional: `schemas/` and other support files when needed.

## Layer Responsibilities

- `routes`: route binding only
- `controller`: request/response mapping only, no business logic
- `service`: business logic only, no direct SQL
- `repository`: data access only, no business decisions

## API Baseline

- All APIs start with `/api`
- Admin APIs use `/api/admin/*`
- Health APIs are fixed as `/api/health/live` and `/api/health/ready`

## Current Refactor Status

- `order` module: migrated to layered structure; public order facade now lives under `service/`
- `product` module: migrated to layered structure and path references fixed
- `admin` module: layered directories are present; some support files remain at module root and should be moved only during structural refactors
- Historical support directories may still exist inside modules, such as `jobs`, `rules`, `adapters`, or `providers`. New business code must first choose the owning module, then choose the correct layer.

Use `npm run check:module-structure` in `server/` as the structural gate.
Use `npm run audit:module-boundaries` to list legacy cross-module internal imports.
After the legacy list is cleared, use `npm run check:module-boundaries` as a strict boundary gate.
