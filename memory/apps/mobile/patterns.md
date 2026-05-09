# Mobile App — Code Patterns & Gotchas

## Reusable Components

| Component | Location | Notes |
|-----------|----------|-------|
| `JobCard` | `components/gig/JobCard.tsx` | Variants: `"explore"` (large, centered), `"space"/"event"` (compact) |
| `SwipeableJobCard` | `components/gig/SwipeableJobCard.tsx` | PanResponder carousel; props: `posterMomentum?: number`, `canApply?: boolean` (default true) |
| `FabSpeedDial` | `components/ui/FabSpeedDial.tsx` | Animated speed dial; Host tab only |
| `StickyFooter` | `components/ui/StickyFooter.tsx` | Never wrap in KeyboardAvoidingView |
| `MomentumBadge` | `components/momentum/MomentumBadge.tsx` | Variants: `"chip"` (explore cards), `"stat"` (applicant cards) |
| `SingleBadge` | `components/ui/VerifiedBadges.tsx` | ID verification + meta badges; `size="sm"/"md"` |
| `BadgeList` | `components/ui/VerifiedBadges.tsx` | Renders `photo_verified` meta-badge + all earned ID badges; `earnedKeys={profile.verified_id_types}` |
| `VerificationCamera` | `components/camera/VerificationCamera.tsx` | Full-screen in-app camera; `mode="id"` (rear, rectangle) or `mode="selfie"` (front, oval); uses `expo-camera` NOT `expo-image-picker` |

## Zustand Stores

| Store | File | Key state |
|-------|------|-----------|
| `useAuthStore` | `stores/authStore.ts` | `profile`, `session`, `activeRole` |
| `useGigStore` | `stores/gigStore.ts` | `gigs`, `myApplications`, `posterScores` |
| `useMomentumStore` | `stores/momentumStore.ts` | `myMomentum` |
| `useChatStore` | `stores/chatStore.ts` | `conversations`, `messages` (hidden) |

## Auth Store Patterns

```typescript
const profile = useAuthStore((s) => s.profile);
const activeRole = useAuthStore((s) => s.activeRole);

// Profile update (direct Supabase, no FastAPI)
useAuthStore.getState().updateProfile({ city: "Mumbai" });

// isOnboarded check (authStore.ts:157)
// Requires: first_name + date_of_birth + gender + city + state
```

## Sign Out

```typescript
// ALWAYS:
router.replace("/");
// NEVER:
router.replace("/(auth)/login");  // Doesn't escape nested navigator
```

## StickyFooter + Keyboard

```typescript
// CORRECT:
<View style={styles.screen}>
  <ScrollView>...</ScrollView>
  <StickyFooter>...</StickyFooter>
</View>

// WRONG — breaks layout:
<KeyboardAvoidingView>
  <StickyFooter>...</StickyFooter>
</KeyboardAvoidingView>
```

## Multiline TextInput Clear

```typescript
// Must call both — setState alone doesn't clear native input on multiline
setText("");
inputRef.current?.clear();
```

## Supabase Insert + Get Row

When you need the inserted row immediately:
```typescript
const { data, error } = await supabase
  .from("gigs")
  .insert({ ...payload })
  .select()
  .single();
// data is the full inserted row
```

## isHost Detection (Event/Gig Screens)

```typescript
// In event detail screen — drives host vs runner split
const isHost = event.poster_id === profile?.id;
```

Note: `activeRole` from authStore is for session-level role. `poster_id` comparison is for per-resource ownership.

## Poster Momentum Pipeline (Explore)

Data flows through these layers to show Host score on each card:

1. `ScoredGig.poster_score` — `backend/api/app/models/gig.py`
2. `_poster_momentum_scores()` — `backend/api/app/services/matching.py`
3. `MatchedGig.poster_score` — `frontend/pocket/lib/api/gigs.ts`
4. `gigStore.posterScores: Record<string, number>` (gigId → score)
5. `explore.tsx` passes `posterScores[gig.id]` as `posterMomentum` to `SwipeableJobCard`
6. `SwipeableJobCard` passes it to `<JobCard>`

## Cache Clearing (when Metro acts up)

```bash
cd frontend
rm -rf node_modules/.cache .expo
npx expo start --clear
```

Run after changing `babel.config.js` or installing Babel plugins.

## Circular Carousel Index Math

```typescript
// Forward
setCurrentIndex((i + 1) % gigs.length);

// Backward (must add length before modulo to avoid negative)
setCurrentIndex((i - 1 + gigs.length) % gigs.length);
```

## Date/Time Handling

- Frontend sends ISO strings to FastAPI
- FastAPI must convert Pydantic strings to Python `date`/`datetime` before PostgreSQL insert

## Labels Pattern

All user-facing strings in `frontend/pocket/constants/labels.ts` → `L.*`:
```typescript
import { L } from "@/constants/labels";
<Text>{L.APP_NAME}</Text>
```
