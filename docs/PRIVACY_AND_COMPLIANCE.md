# Privacy and Compliance Baseline

Last updated: 2026-05-19  
Applicable region (current business context): **Malaysia**

## 1. Data collected (typical in this project)

1. Account data: phone number, password hash, profile nickname/avatar.
2. Transaction data: orders, payment status, refunds, logistics tracking.
3. Contact/fulfillment data: recipient name, phone, address.
4. Marketing/engagement data: notifications read status, favorites, coupons, points/rewards.
5. Operational metadata: access logs, audit logs, IP/user-agent (for security and abuse prevention).

## 2. Data usage

1. User authentication and account security.
2. Order creation, payment processing, shipping, after-sales support.
3. Customer notifications and service announcements.
4. Fraud/risk control, auditing, and issue investigation.
5. Product operation metrics and customer support.

## 3. Data storage locations

1. Primary business data: MySQL.
2. Upload/media data:
   - Local mode: `public/uploads`
   - Object storage mode: S3-compatible bucket when `STORAGE_DRIVER=s3`
3. Runtime logs: server/PM2/Nginx log files.
4. Secrets/config: server `.env` (must be outside git, controlled via secure ops channel).

## 4. Third-party services used

1. Payment gateway (Stripe, when enabled).
2. Object storage (S3-compatible, when enabled).
3. CDN and DNS (Cloudflare, when enabled).
4. Optional SMS provider for OTP (Twilio or HTTP SMS gateway).
5. Optional logistics/payment ecosystem integrations.

See full inventory: `docs/THIRD_PARTY_SERVICES.md`.

## 5. User data correction/deletion request channel

1. Frontend account management capabilities exist for part of profile operations.
2. Backend includes privacy/account routes (for export/cancel paths).
3. Customer support must provide a clear contact channel (email/WhatsApp/support form) for:
   - data correction
   - deletion request
   - complaint handling

Operational requirement: keep request logs and processing SLA internally.

## 6. Sensitive data categories involved

1. Payment-related status data (and gateway metadata where applicable).
2. Logistics and address data.
3. Phone number and account identity fields.
4. Potentially email (if configured in auth/notifications).

## 7. Frontend policy pages that should be visible

1. Privacy Policy
2. User Agreement / Terms of Service
3. Refund Policy
4. Shipping/Delivery Policy

Recommendation: ensure these pages are linked in footer/account center and maintained by policy owner.

## 8. Compliance operating notes (Malaysia context)

1. Apply Malaysia privacy and consumer-commerce obligations to collected personal data.
2. If e-invoicing is enabled, align operations with MyInvois process and retention requirements.
3. Keep legal sign-off records for policy updates and data-processing changes.

## 9. Release gate checklist (privacy)

1. Policy documents published and reachable on production domain.
2. Data export/deletion support path tested and documented for support team.
3. Third-party data-sharing scope reviewed.
4. Any new data field in release has purpose + retention + access-control owner.

