# Damatong Admin Cloudflare Security Rules

Production domains:

- Storefront: `damatong.net`, `www.damatong.net`
- Admin console: `console.damatong.net`
- Required access order: Cloudflare Access -> admin login -> MFA -> RBAC

## DNS and SSL

- `damatong.net` and `www.damatong.net` point to the storefront deployment.
- `console.damatong.net` points to the admin deployment.
- Both records should be proxied through Cloudflare.
- SSL/TLS mode should be `Full (strict)`.

## Cloudflare Access

Protect the whole admin hostname before the application login page:

- Access Application domain: `console.damatong.net`
- Path: `/*`
- Policy: allow only administrator emails or administrator identity provider groups.
- Session duration: keep short, for example 8 hours.

Do not create a Cloudflare Access application for `damatong.net` or `www.damatong.net`; the public storefront must remain public. Its `/admin` UI path can redirect users to `console.damatong.net`, while `/api/admin` remains blocked by WAF and origin rules.

## WAF Custom Rules

Block admin API paths on the public storefront hostname:

```text
(http.host in {"damatong.net" "www.damatong.net"} and starts_with(http.request.uri.path, "/api/admin/"))
or
(http.host in {"damatong.net" "www.damatong.net"} and http.request.uri.path eq "/api/admin")
```

Action: `Block`.

Only allow admin API on the admin hostname:

```text
starts_with(http.request.uri.path, "/api/admin/")
and http.host ne "console.damatong.net"
```

Action: `Block`.

Challenge suspicious admin login traffic:

```text
http.host eq "console.damatong.net"
and http.request.uri.path eq "/api/admin/auth/login"
and (
  cf.threat_score ge 10
  or not http.user_agent contains "Mozilla"
)
```

Action: `Managed Challenge`.

## Rate Limiting

Create an edge rate limit for admin login:

- Expression:

```text
http.host eq "console.damatong.net"
and http.request.uri.path eq "/api/admin/auth/login"
and http.request.method eq "POST"
```

- Characteristics: IP address.
- Threshold: 10 requests per 1 minute.
- Mitigation timeout: 30 minutes.
- Action: `Block` or `Managed Challenge`.

Keep the server-side login limiter enabled as a second layer. The origin still enforces IP + account risk controls and account lockout.

## Origin Hardening

Prevent bypassing Cloudflare Access by direct origin access:

- Prefer Cloudflare Tunnel for the Node/Nginx origin.
- If using a public origin IP, restrict inbound firewall rules to Cloudflare IP ranges only.
- Keep `TRUST_PROXY=1` so the backend reads Cloudflare/Nginx forwarded client IPs correctly.

## Origin Variables

Set backend environment variables:

```env
PUBLIC_APP_URL=https://damatong.net
ADMIN_PUBLIC_URL=https://console.damatong.net
ADMIN_ALLOWED_ORIGINS=https://console.damatong.net
CORS_ORIGINS=https://damatong.net,https://www.damatong.net,https://console.damatong.net
NODE_ENV=production
TRUST_PROXY=1
ADMIN_MFA_SECRET_KEY=<long-random-secret>
ADMIN_MFA_ISSUER=Damatong Admin
```

Keep `ADMIN_ALLOWED_ORIGINS` narrow in production. Do not include `damatong.net`, `www.damatong.net`, localhost, wildcard origins, or the public storefront unless temporarily using `ADMIN_COMPAT_ALLOW_PUBLIC_APP_ORIGIN=1` for a controlled migration.
