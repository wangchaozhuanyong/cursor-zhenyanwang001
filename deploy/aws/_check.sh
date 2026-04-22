#!/usr/bin/env bash
set +e
sleep 2
echo '=== pm2 list ==='
pm2 list
echo
echo '=== err log (tail 30) ==='
pm2 logs gc-api --lines 25 --nostream --err 2>&1 | tail -30
echo
echo '=== out log (tail 15) ==='
pm2 logs gc-api --lines 10 --nostream --out 2>&1 | tail -15
echo
echo '=== port 3001 ==='
ss -ltnp 2>/dev/null | grep 3001 || echo 'NOT LISTENING'
echo
echo '=== health attempts ==='
for i in 1 2 3 4 5 6; do
  c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health/live --max-time 3 2>/dev/null)
  echo "  attempt $i -> $c"
  [ "$c" = "200" ] && break
  sleep 2
done
echo
echo '=== /api/health/live response (raw) ==='
curl -s --max-time 3 http://127.0.0.1:3001/api/health/live; echo
echo
echo '=== /api/health/ready response (raw) ==='
curl -s --max-time 3 http://127.0.0.1:3001/api/health/ready; echo
