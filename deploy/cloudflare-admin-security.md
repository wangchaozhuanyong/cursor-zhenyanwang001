# Admin Cloudflare Security Rules

Replace `yourdomain.com` with the production storefront domain and `admin.yourdomain.com` with the production admin domain.

## DNS and SSL

- `yourdomain.com` points to the storefront deployment.
- `admin.yourdomain.com` points to the admin deployment.
- Both records should be proxied through Cloudflare.
- SSL/TLS mode should be `Full (strict)`.

## Cloudflare Access

Protect the whole admin hostname before the application login page:

- Application domain: `admin.yourdomain.com`
- Path: `/*`
- Policy: allow only administrator identity provider groups or approved admin emails.
- Session duration: keep short, for example 8 hours.

## WAF Custom Rules

Block admin paths on the public storefront hostname:

```text
(http.host eq "yourdomain.com" and starts_with(http.request.uri.path, "/admin"))
or
(http.host eq "yourdomain.com" and starts_with(http.request.uri.path, "/api/admin/"))
```

Action: `Block`.

Only allow admin API on the admin hostname:

```text
starts_with(http.request.uri.path, "/api/admin/")
and http.host ne "admin.yourdomain.com"
```

Action: `Block`.

Challenge suspicious admin login traffic:

```text
http.host eq "admin.yourdomain.com"
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
http.host eq "admin.yourdomain.com"
and http.request.uri.path eq "/api/admin/auth/login"
and http.request.method eq "POST"
```

- Characteristics: IP address.
- Threshold: 10 requests per 1 minute.
- Mitigation timeout: 30 minutes.
- Action: `Block` or `Managed Challenge`.

## Origin Variables

Set backend environment variables:

```env
PUBLIC_APP_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
ADMIN_ALLOWED_ORIGINS=https://admin.yourdomain.com
ADMIN_JWT_EXPIRES_IN=15m
ADMIN_MFA_SECRET_KEY=<long-random-secret>
ADMIN_MFA_ISSUER=<brand-name> Admin
```

Keep `ADMIN_ALLOWED_ORIGINS` narrow in production. Do not include localhost or wildcard origins outside local development.
