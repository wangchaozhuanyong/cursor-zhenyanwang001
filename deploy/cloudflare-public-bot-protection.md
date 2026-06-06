# Cloudflare Public Bot Protection

This optional rule set is for the public storefront hosts `damatong.net` and
`www.damatong.net`.

## Goal

- Keep `/tiktok` available as the public promotion landing page.
- Keep `/robots.txt` and `/sitemap.xml` available for compliant crawlers.
- Block or challenge obvious bot-like requests on the main storefront, product
  pages, category pages, search, content pages, static assets, and public API
  paths.

## Rules

The script manages two rules in Cloudflare phase
`http_request_firewall_custom`:

1. Known AI/crawler user agents are blocked.
2. Generic bot-like user agents are sent to `managed_challenge`.

The rules are scoped only to public hosts. They do not target
`console.damatong.net`.

## Exempt Paths

- `/tiktok`
- `/robots.txt`
- `/sitemap.xml`
- `/assets/tiktok-*`
- `/.well-known/*`
- `/api/health/*`

## Apply

This is not applied automatically by default during release. To apply during
`deploy/ci-deploy.sh`, set:

```bash
APPLY_CF_PUBLIC_BOT_RULES=1
```

Manual apply:

```bash
bash deploy/cloudflare-apply-public-bot-rules.sh
```

Dry run:

```bash
bash deploy/cloudflare-apply-public-bot-rules.sh dry-run
```

Required environment variables:

- `CF_API_TOKEN`
- `CF_ZONE_ID`

Optional environment variables:

- `CF_PUBLIC_HOSTS`, default: `damatong.net,www.damatong.net`
- `CF_PUBLIC_BOT_BLOCK_RULE_NAME`
- `CF_PUBLIC_BOT_CHALLENGE_RULE_NAME`

## Rollback

Delete or disable the two Cloudflare custom rules named by:

- `CF_PUBLIC_BOT_BLOCK_RULE_NAME`
- `CF_PUBLIC_BOT_CHALLENGE_RULE_NAME`

Default rule names:

- `public-storefront-ai-crawler-block`
- `public-storefront-bot-challenge`

## Optional Bot Management

Bot Management is more aggressive than the custom WAF rules above, so it is
also disabled by default.

Dry run:

```bash
bash deploy/cloudflare-apply-bot-management.sh dry-run
```

Conservative apply:

```bash
APPLY_CF_BOT_MANAGEMENT=1 \
CF_BOT_MANAGEMENT_MODE=conservative \
CF_BOT_MANAGEMENT_ACK=KEEP_TIKTOK_AVAILABLE \
bash deploy/cloudflare-apply-bot-management.sh apply
```

The script first creates a Super Bot Fight Mode skip rule for `/tiktok`,
`/assets/tiktok-*`, `/robots.txt`, and `/sitemap.xml`.

Modes:

- `conservative`: challenge definitely automated traffic and keep likely bots,
  verified bots, content bots, and AI bot blocking relaxed.
- `ai-only`: block Cloudflare AI bot protection only. This requires
  `CF_BOT_MANAGEMENT_RISK_ACK=AI_BOTS_CAN_AFFECT_TIKTOK`.
- `aggressive`: block AI/content crawlers and challenge more bot traffic. This
  also requires `CF_BOT_MANAGEMENT_RISK_ACK=AI_BOTS_CAN_AFFECT_TIKTOK`.

Use `conservative` first and watch Cloudflare Security Events before moving to
the stronger modes.
