# Third-Party Services Register (SLA Ledger)

Last updated: 2026-05-19

> Fill real account links, vendor contracts, and owner contacts before each major release.

| Service | Purpose | Core transaction impact | Failure impact | Fallback / alternative | Contact or management entry |
|---|---|---:|---|---|---|
| Cloud VM (EC2 or equivalent) | Runs API/PM2/Nginx | Yes | Full service outage if single instance fails | Standby instance + infra recovery runbook | Cloud console + infra owner |
| MySQL database | Core order/user/payment state | Yes | Read/write failure blocks business | Restore from backup, failover replica (if configured) | DB console / DBA owner |
| Object storage (S3-compatible) | Product/media assets | Partial to high (depends on flow) | Image upload/display failures | Local `public/uploads` fallback (temporary), CDN cache | Storage console / ops owner |
| SMS provider (Twilio/HTTP gateway) | OTP and account login (when enabled) | High for SMS login users | Login OTP delivery failure | Disable SMS login or switch provider | Provider portal + auth owner |
| Payment gateway (Stripe) | Online payment processing | Yes | Payment creation/webhook failures | Manual reconciliation + retry + fallback payment channel | Stripe dashboard + finance/engineering owner |
| WhatsApp deep link | Customer contact/jump | No (usually) | Contact button unavailable | Web support form / phone support | Frontend config owner |
| CDN (Cloudflare or equivalent) | Static acceleration and caching | Partial | Slower access, possible stale cache | Bypass cache / purge / direct origin | CDN console + ops owner |
| Domain / DNS provider | Domain resolution | Yes | Site inaccessible by domain | Secondary DNS / emergency DNS update plan | Registrar/DNS console + ops owner |
| Email service (if used) | Notification and account communication | Partial | Missing email notifications | In-app notice / SMS / customer support broadcast | Mail provider console |
| Logistics tracking API (if used) | Shipment status updates | Partial | Tracking info delay/inaccuracy | Manual status sync / customer support intervention | Logistics vendor portal |

## Minimum SLA evidence to keep

1. Vendor name and service owner.
2. Support channels and escalation contacts.
3. Service status page URL.
4. Rate-limit and retry constraints.
5. Planned fallback procedure and decision owner.

## Release-day checks

1. Verify third-party credentials/keys are valid.
2. Verify callback URLs/webhook secrets are correct.
3. Verify current vendor status pages are healthy.
4. Verify fallback switch plan is known by on-call team.

