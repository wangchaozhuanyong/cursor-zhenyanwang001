# CloudFront + S3 Hardening Checklist

## Bucket Baseline
- [ ] Enable `Block Public Access` on bucket and account.
- [ ] Disable ACLs (`Bucket owner enforced`).
- [ ] Enable server-side encryption (`SSE-S3` or `SSE-KMS`).
- [ ] Enable versioning.
- [ ] Add lifecycle for `uploads/raw/*` expiration.

## Access Path
- [ ] Create CloudFront distribution for media.
- [ ] Use Origin Access Control (OAC), not public bucket.
- [ ] Bucket policy allows `s3:GetObject` only from CloudFront service principal + distribution ARN.
- [ ] Deny direct public `GetObject` on bucket.

## Response Security Headers
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Content-Security-Policy` (for app pages, not binary objects)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Strict-Transport-Security` enabled on main domain

## Upload Controls
- [ ] Upload only via presigned URL from backend.
- [ ] Presigned URL expiration <= 5 minutes.
- [ ] Fixed upload prefix; no arbitrary object key.
- [ ] Content type allowlist and max size enforced server-side.

## Processing Controls
- [ ] Store raw uploads under private prefix.
- [ ] Async sanitize/re-encode to safe format.
- [ ] Strip EXIF metadata.
- [ ] Publish only sanitized object URL.

## Monitoring and Detection
- [ ] Enable CloudTrail data events for S3 object operations.
- [ ] Enable S3 server access logs or CloudFront standard logs.
- [ ] Alarm on unusual upload burst / error spike.
- [ ] Track top upload IPs and blocked attempts.

## Validation Tests
- [ ] Upload valid JPG/PNG/WEBP succeeds.
- [ ] Upload SVG/renamed executable fails.
- [ ] Oversized upload fails with controlled error.
- [ ] Direct bucket URL access denied.
- [ ] CloudFront URL access succeeds.
- [ ] Non-S3 return URL is rejected by frontend upload guard.
