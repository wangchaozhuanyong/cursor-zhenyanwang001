# Release Safety Guard

This project uses the standard deploy chain:

```bash
bash deploy/ci-deploy.sh
```

Production safety rules:

- GitHub auto deploy pins `DEPLOY_TARGET_SHA` from the successful CI run.
- The server deploys that exact commit, not whatever `main` points to later.
- `deploy/production-deploy.sh` refuses old or divergent targets by default.
- A release target must contain the current production `HEAD` and `.deploy-state/last_good_head`.
- Intentional rollback must use `deploy/rollback.sh`.
- Rollback sets `DEPLOY_MODE=rollback` and `ALLOW_OLD_DEPLOY=1`.
- `SKIP_GIT=1` deploy is refused by default because archive/local-file deploys can overwrite newer production code.
- Use `ALLOW_SKIP_GIT_DEPLOY=1` only for documented break-glass runs.
- Local frontend dist upload checks local `HEAD`, `origin/main`, server `HEAD`, and frontend dirty files before syncing.
- Use `-AllowOutOfDateLocalBuild` only for documented break-glass runs.
- CI rejects non-fast-forward `main` updates, so force-pushed old code will not trigger production deploy.

Recommended release path:

```bash
git push origin main
# Wait for CI success and Deploy gc-api (CI/CD) success.
```

Manual production deploy:

```bash
PROJECT_DIR=/var/www/click-send-shop \
PM2_APP=gc-api \
GIT_BRANCH=main \
AUTO_ROLLBACK=1 \
BUILD_FRONTEND_ON_SERVER=1 \
bash deploy/release-deploy.sh
```

Intentional rollback:

```bash
bash deploy/rollback.sh <commit_sha>
```
