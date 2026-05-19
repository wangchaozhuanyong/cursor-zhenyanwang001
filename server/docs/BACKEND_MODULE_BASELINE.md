# Backend Module Baseline

This backend uses a modular monolith with strict layering.

## Fixed Module List

The backend module boundary is fixed to these 19 modules under `src/modules`:

1. admin
2. analytics
3. auth
4. cart
5. health
6. home
7. logistics
8. loyalty
9. marketing
10. myinvois
11. notification
12. order
13. payment
14. privacy
15. product
16. search
17. seo
18. theme
19. user

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

- `order` module: migrated to layered structure
- `product` module: migrated to layered structure and path references fixed
- `admin` module: still contains legacy top-level layer files and is the next migration target

Use `npm run check:module-structure` in `server/` as the structural gate.
