# Cloudflare Origin Hardening

This layer helps stop direct-origin bypass behind Cloudflare.

## Safe default

Nothing here is enabled by default.

Dry run:

```bash
bash deploy/origin-cloudflare-only-firewall.sh dry-run
```

Apply:

```bash
APPLY_ORIGIN_CLOUDFLARE_ONLY=1 \
ORIGIN_FIREWALL_ACK=ONLY_CLOUDFLARE_CAN_REACH_80_443 \
sudo -E bash deploy/origin-cloudflare-only-firewall.sh apply
```

Rollback:

```bash
ORIGIN_FIREWALL_ROLLBACK_ACK=REMOVE_CLOUDFLARE_ONLY_RULES \
sudo -E bash deploy/origin-cloudflare-only-firewall.sh rollback
```

## What it does

- Allows Cloudflare IP ranges to reach ports `80,443`.
- Drops direct non-Cloudflare traffic to ports `80,443`.
- Does not touch SSH, database, Redis, PM2, Node, or application files.
- Uses a dedicated iptables chain so rollback is predictable.

## Before applying

Confirm these DNS records are proxied through Cloudflare:

- `damatong.net`
- `www.damatong.net`
- `console.damatong.net`

Confirm these URLs work through Cloudflare before and after applying:

- `https://damatong.net/`
- `https://damatong.net/tiktok`
- `https://damatong.net/api/health/live`
- `https://console.damatong.net/admin/login`

## Tunnel option

`deploy/cloudflared-damatong.yml.example` is a starting point for Cloudflare
Tunnel. Tunnel is safer long-term because the origin can stop accepting public
inbound HTTP/HTTPS traffic.

Do not switch DNS to the tunnel until the tunnel status is healthy and the
public URLs above pass.
