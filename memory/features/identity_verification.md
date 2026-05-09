---
name: Identity Verification
description: Multi-ID face-match verification pipeline (Inspector integration, badge system, in-app camera)
type: project
---

# Identity Verification

## Overview

Runners can verify multiple government ID types independently. Each verified ID earns a badge. Verification uses the Inspector pipeline (RetinaFace + ArcFace face matching) proxied through the Kria FastAPI backend.

## Supported ID Types

`aadhaar` | `pan` | `driving_licence` | `passport` | `voter_id`

Defined in `frontend/pocket/lib/api/profile.ts` → `ID_TYPE_OPTIONS` and `IDType`.

## User Flow (Mobile)

1. Profile → "Verify Identity" → `app/(main)/verify-identity.tsx`
2. **List screen:** Shows all 5 ID types. Each has "Verify →" button or green "Verified" pill. Earned badges shown at top via `BadgeList`.
3. Tap "Verify" on any ID type → full-screen `VerificationCamera mode="id"` (rear camera, ISO ID-1 rectangle + corner brackets)
4. Capture → immediately transitions to `VerificationCamera mode="selfie"` (front camera, oval contour)
5. Capture → submits to backend; processing spinner shown
6. **Success:** `verified_id_types` updated in DB; `fetchProfile()` refreshes badges; success screen names the specific ID
7. **Failure:** Error screen with specific reason + retry option

## Camera Component — `VerificationCamera`

`frontend/pocket/components/camera/VerificationCamera.tsx`

- Props: `mode: "id" | "selfie"`, `onCapture: (uri: string) => void`, `onClose: () => void`
- Uses `expo-camera` (`CameraView`, `useCameraPermissions`) — NOT `expo-image-picker`
- Permission gate built in (shows "Allow Camera" screen if denied)

**ID mode:** Rear camera, rectangle guide at ISO ID-1 aspect (1.585), corner bracket accents
**Selfie mode:**
- Front camera
- Oval face guide: `OVAL_W = SW * 0.62`, `OVAL_H = OVAL_W * 1.35`
- **Capture window (dark bars) is LARGER than the oval:** `SELFIE_CAP_W = SW * 0.88`, `SELFIE_CAP_H = OVAL_H + 96`
- This ensures Inspector receives face + surrounding context even when face fills the oval — prevents zoomed-in crop errors
- `takePictureAsync({ quality: 0.88 })` — captures full camera frame (beyond the oval)

**SpotlightMask:** 4 dark bars (`rgba(0,0,0,0.60)`) positioned by `capW/capH`; face guide border drawn at `guideW/guideH`. For selfie mode these differ — bars are wider than the oval.

## Badge System — `VerifiedBadges`

`frontend/pocket/components/ui/VerifiedBadges.tsx`

**Types:** `BadgeKey = "aadhaar" | "pan" | "driving_licence" | "passport" | "voter_id" | "photo_verified"`

`photo_verified` is a meta-badge — auto-shown by `BadgeList` when any ID is verified.

**Components:**
- `SingleBadge({ badgeKey, size?: "sm" | "md" })` — pill with icon + label
- `BadgeList({ earnedKeys, showPhotoVerified?, size? })` — renders `photo_verified` first + all earned IDs

**Usage:**
```typescript
<BadgeList earnedKeys={profile.verified_id_types} size="md" />
<SingleBadge badgeKey="aadhaar" size="sm" />
```

Badge colors are from `BADGE_DEFS` — each ID type has its own `color`/`bg`/`icon`. The icons from `BADGE_DEFS` are also used in the verify-identity list screen for the ID row icons.

## API Layer

**Frontend:** `frontend/pocket/lib/api/profile.ts`
- `verifyIdentityWithImages(idType, idCardUri, selfieUri)` — sends multipart FormData
- React Native FormData file pattern: `{ uri, name, type } as unknown as Blob`
- Uses `apiPostFormData` from `lib/api/client.ts` (no Content-Type header — lets fetch set multipart boundary)

**Backend:** `backend/api/app/routers/profiles.py` — `POST /api/v1/profiles/verify-identity`
- Accepts multipart: `id_type` (Form), `id_image` (File), `selfie` (File)
- Validates id_type against `VALID_ID_TYPES` set
- Validates images: content-type + size (max 10 MB each)
- Proxies to Inspector via `_call_inspector()` using `httpx.AsyncClient(timeout=30)`
- Maps Inspector response to error codes the mobile app understands (see below)
- On success: UPDATE profiles using `jsonb_build_array(:id_type)` for `verified_id_types` append (avoids `::jsonb` cast which breaks asyncpg param binding)
- On Inspector unavailable: returns HTTP 503

**Error code mapping (Inspector → mobile):**

| Inspector signal | `error_code` returned | Mobile screen |
|---|---|---|
| `id_face_detected=False` | `no_face_id` | "No face found on ID" |
| `selfie_face_detected=False` | `no_face_selfie` | "No face found in selfie" |
| `spoof_detected=True, spoof_reason="duplicate_submission"` | `duplicate_submission` | "Verification failed" |
| `spoof_detected=True, spoof_reason="face_spoof_detected"` | `face_spoof_detected` | "Verification failed" |
| `is_match=False` | `low_confidence` | "Couldn't confirm identity" |
| Inspector unreachable | HTTP 503 | "Connection error" |

## Inspector Integration

See `perceptrons/inspector/` and `memory/architecture/stack.md` for full Inspector docs.

**Key facts for the proxy:**
- Inspector URL: `INSPECTOR_URL=http://inspector:8000` (env var on `kria-api`)
- Inspector joins `kria-network` via `docker-compose.dev.yml`
- `httpx` already in `backend/api/requirements.txt`
- `python-multipart>=0.0.9` required for FastAPI `File()` params (already in requirements)
- Single worker on Inspector (`--workers 1`) — model weights ~300–600 MB RAM

## Known Gotchas

- **`::jsonb` cast breaks asyncpg:** Using `:param::jsonb` in SQLAlchemy `text()` with asyncpg — asyncpg converts named params to `$N` positionals but leaves `::jsonb` as literal text, causing `PostgresSyntaxError: syntax error at or near ":"`. Fix: use `jsonb_build_array(:param)` instead.
- **Inspector warm-up:** First request after boot takes ~30–60s while models load. The endpoint returns 503 during this window; mobile shows "Connection error, try again."
- **Anti-spoof disabled in dev:** `ANTISPOOF_MODEL_ENABLED=False` in Inspector docker env. Random photos of objects will pass the face match check (if they happen to contain a face-like pattern), but won't survive spoof detection when enabled.
