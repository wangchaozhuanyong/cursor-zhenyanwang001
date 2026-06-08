# Branch, Release, and Archive Guide

This repository uses a trunk-based release model:

- `main` is the only long-lived branch.
- GitHub Actions deploys after CI succeeds on `main`.
- Short-lived work branches are used for changes and merged back to `main`.
- Release and archive points are recorded with tags, not permanent release branches.

## Branch Rules

Use these branch name prefixes:

- `feature/<short-name>` for new product work.
- `fix/<short-name>` for bug fixes.
- `chore/<short-name>` for tooling, deployment, cleanup, or documentation.
- `hotfix/<short-name>` for urgent production fixes.

Delete work branches after they are merged. Do not keep `release/*` branches unless a release must be staged for more than one day.

## Normal Release Flow

1. Start from the latest `main`.
2. Create a short-lived branch.
3. Commit the change and open a PR.
4. Merge to `main` after checks pass.
5. Let GitHub Actions deploy from `main`.
6. Verify production health:

```bash
curl -fsS https://damatong.net/api/health/ready
```

## Manual AWS Deploy

On the AWS server:

```bash
cd /var/www/click-send-shop
git fetch --prune origin
git checkout main
git reset --hard origin/main
AUTO_ROLLBACK=1 bash deploy/ci-deploy.sh
```

Use manual deploy only when GitHub Actions is unavailable or an operator explicitly chooses an emergency release path.

## Archive Tags

Create archive tags for meaningful points:

- Before large cleanup: `archive/pre-cleanup-YYYYMMDD`
- After a successful release: `release/YYYYMMDD-<short-name>`
- Before risky emergency work: `archive/pre-hotfix-YYYYMMDD-HHMM`

Example:

```bash
git tag -a archive/pre-cleanup-20260608 -m "Archive before branch cleanup"
git push origin archive/pre-cleanup-20260608
```

## Rollback

Use the deployment state first:

```bash
cd /var/www/click-send-shop
cat .deploy-state/last_good_head
bash deploy/rollback.sh "$(cat .deploy-state/last_good_head)"
```

For tag-based rollback:

```bash
cd /var/www/click-send-shop
git fetch --tags origin
git checkout <tag-or-sha>
AUTO_ROLLBACK=0 bash deploy/ci-deploy.sh
```

## Local AWS Database Tunnel

For local development against the AWS database:

```bash
scripts/start-aws-db-tunnel.sh
```

This exposes the AWS MySQL server locally as `127.0.0.1:3307`. Use it carefully because local backend writes affect production data if the backend is configured to use the tunnel.
