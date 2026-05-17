# Backend Upload Go-Live Checklist

## Goal
- Ensure all image uploads are safe, S3-backed, and non-executable.
- Prevent upload path from becoming an attack path into app/database.

## Must Pass (P0)
- [x] Upload ticket endpoint requires auth (`POST /api/upload/ticket`).
- [x] Upload endpoint enforces mime allowlist (`image/jpeg`, `image/png`, `image/webp`).
- [x] Backend verifies magic bytes (not extension-only).
- [x] Max file size enforced server-side.
- [x] Max pixel dimensions / megapixels enforced (~25MP).
- [x] Object key is server-generated UUID (no user filename injection).
- [ ] Raw uploads are private in S3.
- [ ] Public delivery is through CloudFront only.
- [ ] App only stores object keys / trusted URLs.
- [ ] Any non-S3/non-CloudFront URL is rejected by backend.

## Strongly Recommended (P1)
- [ ] Async sanitize/re-encode pipeline enabled.
- [ ] Strip EXIF / GPS metadata.
- [ ] Rate limit by user/IP for upload endpoints.
- [ ] Virus scanning or content scanning for raw files.
- [x] Structured audit logs enabled for upload actions (`upload.*` / `upload.presign_*`).

## S3 / CloudFront Hardening
- [ ] Bucket CORS configured for browser `PUT` (see `S3-CORS-PRESIGNED-UPLOAD.md`).
- [ ] Bucket `Block Public Access` enabled.
- [ ] ACL disabled (`Bucket owner enforced`).
- [ ] Bucket encryption enabled.
- [ ] OAC enabled on CloudFront origin.
- [ ] Bucket policy denies direct public `GetObject`.
- [ ] Lifecycle rules expire old raw files.

## Operational Safety
- [ ] Alert on upload error spike (4xx/5xx).
- [ ] Alert on unusual upload traffic bursts.
- [ ] Upload incidents include trace ID in logs.
- [ ] Rollback switch exists to disable uploads quickly.

## Acceptance Evidence
- [ ] Upload valid JPG returns S3/CloudFront URL.
- [ ] Upload oversized file is blocked with clear error.
- [ ] Upload invalid mime is blocked.
- [ ] Direct bucket URL access is denied (if private bucket).
- [ ] Frontend upload verification page shows `S3 verified`.
