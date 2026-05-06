#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

bash 01-create-foundation.sh
bash 02-bootstrap-ec2.sh
bash 03-deploy-app.sh
bash 04-migrate-db.sh
bash 05-route53-https-cutover.sh
bash 06-validate-and-finalize.sh

echo "All migration phases completed."
