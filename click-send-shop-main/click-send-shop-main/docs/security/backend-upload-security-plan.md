# Backend Image Upload Security Plan

## Scope
- Applies to all image uploads from client and admin.
- Target storage: Amazon S3 only.
- Public access path: CloudFront only.

## Threat Model
- Malicious file upload pretending to be an image.
- Image parser vulnerabilities during resize/thumbnail generation.
- Path traversal or dangerous filename injection.
- Abuse via high-frequency upload traffic.
- Direct public bucket exposure and object enumeration.

## Required Architecture
1. Client requests a one-time upload ticket from backend.
2. Backend issues presigned POST/PUT limited to:
- Content type whitelist
- Max file size
- Fixed object prefix (`uploads/raw/{tenant}/{user}/`)
- Short expiration (60-300 seconds)
3. Client uploads directly to S3 using presigned data.
4. Backend stores object key only (not user-supplied URL).
5. Async worker reads raw object, decodes, sanitizes, re-encodes to safe format.
6. Worker writes sanitized object to `uploads/public/...`.
7. Frontend only renders sanitized object URL via CloudFront domain.

## Validation Rules (Backend)
- Allow only: `image/jpeg`, `image/png`, `image/webp`.
- Reject SVG by default unless separately sandboxed.
- Verify magic bytes, not extension alone.
- Enforce:
- Max bytes (example 15MB)
- Max width/height (example 6000x6000)
- Max megapixels (example 25MP)
- Filename replaced with UUID; no original name in object key.

## Processing Rules
- Use hardened image libraries (`sharp/libvips`) with current patches.
- Decode and re-encode image before publication.
- Strip EXIF and geolocation metadata.
- Never serve raw uploads directly to end users.

## API Contract (Suggested)
- `POST /api/upload/ticket`
- Input: `mimeType`, `size`, `purpose`
- Output: `uploadUrl`, `fields`, `objectKey`, `expiresAt`
- `POST /api/upload/complete`
- Input: `objectKey`, `purpose`
- Output: `assetId`, `status` (`queued|ready|failed`)
- `GET /api/upload/status/:assetId`
- Output: final public URL when ready

## Data Model (Suggested)
- `uploaded_assets`
- `id`, `owner_id`, `purpose`, `raw_key`, `public_key`
- `mime`, `size_bytes`, `sha256`
- `status`, `scan_status`, `created_at`, `updated_at`

## Operational Controls
- Auth required for upload ticket.
- Rate limit by user and IP.
- Daily quota by role.
- Structured audit log:
- `user_id`, `ip`, `object_key`, `mime`, `size`, `result`, `trace_id`

## Rollback and Failure Strategy
- If sanitizer fails, mark status `failed`; do not publish URL.
- Keep raw object private and lifecycle-expire it.
- Feature flag to disable new uploads in incident mode.

## Completion Criteria
- No endpoint accepts direct image bytes into app server filesystem.
- All public image URLs resolve to CloudFront domain.
- Raw bucket objects are private and not directly browsable.
- Security logs and rate-limits are active in production.
