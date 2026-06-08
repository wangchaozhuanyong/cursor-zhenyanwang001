#!/usr/bin/env bash
set -euo pipefail

screen -S zhenyan-aws-db-tunnel -X quit >/dev/null 2>&1 || true
echo "AWS DB tunnel stopped"
