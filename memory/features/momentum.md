---
name: Momentum System
description: Runner trust score — 0–1000 scale, 6 bands, plugin signal architecture, JSONB signal_scores, dynamic skill graphs, profile completion bonus
type: project
---

# Momentum System

FICO-inspired trust index for **Runners only** (0–1000). Hosts receive a simple /10 rating from Runners (separate system, not Momentum).

## Scale & Philosophy

- **Range:** 0–1000
- **New users:** Can reach up to 80 pts from profile completion alone (Newcomer band, 0–99)
- **Credibility ramp:** `min(gig_count / 10, 1.0)` — full score potential only after 10 completed gigs
- **NULL signals:** Missing signals excluded from numerator — max achievable score grows as more signals unlock
- **No passive recovery** — only real behaviour changes the score
- **Drops fast** on violations; grows slowly on good gigs

## Score Formula

```
weights        = normalized_weights() from registry (fractions sum to 1.0)
credibility    = min(gig_count / 10, 1.0)
weighted_sum   = Σ (weight_i × normalize(signal_i))   [only non-NULL signals]
gig_score      = weighted_sum × 1000 × credibility − penalty_points
profile_points = Σ points for filled profile fields (capped at MAX_PROFILE_POINTS = 80)
score          = clamp(gig_score + profile_points, 0, 1000)
```

Key change from old design: weights no longer need to sum to 100. They are relative and auto-normalized by the registry at startup. `normalized_weights()` returns fractions summing to 1.0.

**Profile points are additive outside the credibility formula** — a new runner with a complete profile can reach up to 80, but stays in Newcomer (0–99) until gig signals flow.

## Bands (Solar Flare, 6-band)

| Band | Range | Color | Hex |
|------|-------|-------|-----|
| Newcomer | 0–99 | gray | `#777575` |
| Building | 100–299 | coral | `#ff7351` |
| Reliable | 300–499 | cobalt | `#8097ff` |
| Trusted | 500–699 | amber | `#FFC83D` |
| Elite | 700–899 | lime | `#D4FF00` |
| Legend | 900–1000 | white | `#ffffff` |

## Plugin Signal Architecture

**Signals are Python files.** Each file in `backend/api/app/momentum/signals/` that does not start with `_` is auto-discovered at startup by the registry. No other files need to change.

### Signal File Contract

Every signal file must export exactly two things:

```python
from app.momentum.signals._base import Signal

SIGNAL = Signal(
    key="signal_key",         # unique key, stored in signal_scores JSONB
    label="Human Label",      # display name in breakdown UI
    short_label="Short",      # abbreviated label for radar chart axes
    description="...",        # one-line explanation shown to the runner
    icon="feather-icon-name", # Feather icon for mobile UI
    color="#hexcolor",        # accent color for this signal in UI
    weight=20.0,              # relative weight (auto-normalized, no sum constraint)
    max_points=1.0,           # divides raw value to get 0.0–1.0 (use 5.0 for 1–5 ratings)
)

async def compute(user_id: str, db: AsyncSession) -> float | None:
    # Return the raw signal value, or None if not yet computable (no data)
    ...
```

### Registry (`momentum/registry.py`)

- Auto-discovers all `.py` files in `signals/` that don't start with `_`
- Validates each has `SIGNAL` + `compute`; logs a warning and skips malformed files
- `get_signals() -> list[Signal]` — all discovered signals in filesystem order
- `normalized_weights() -> dict[str, float]` — weight fractions summing to 1.0
- `run_all(user_id, db) -> dict[str, float | None]` — runs every signal's compute(), catches exceptions → None

### Current Signals (5 gig-based)

| File | Key | Label | Short | Weight | `max_points` | Source |
|------|-----|-------|-------|--------|---------|--------|
| `show_rate.py` | `show_rate` | Reliability | Reliab. | 35 | 1.0 | `gig_assignments` completed/(completed+no_show) |
| `on_time_rate.py` | `on_time_rate` | Punctuality | Punct. | 25 | 1.0 | `otp_verified_at::time ≤ report_time + 15 min` |
| `performance_score.py` | `performance_score` | Work Quality | Quality | 20 | 5.0 | `ratings.score` AVG (1–5) |
| `communication_score.py` | `communication_score` | Communication | Comms | 10 | 5.0 | `ratings.communication_score` AVG (1–5) |
| `professionalism_score.py` | `professionalism_score` | Professionalism | Conduct | 10 | 5.0 | `ratings.professionalism_score` AVG (1–5) |

Signal colors: Reliability=`#8097ff`, Punctuality=`#FFC83D`, Work Quality=`#D4FF00`, Communication=`#ff7351`, Professionalism=`#22c55e`

### Signal Storage: `signal_scores` JSONB

Migration `0016` added `signal_scores jsonb NOT NULL DEFAULT '{}'` to `momentum_profiles`. The old individual signal columns (`worker_show_rate` etc.) remain in the DB but are no longer written or read by the new code. The recalculator writes everything into `signal_scores`.

```json
{
  "show_rate": 0.92,
  "on_time_rate": 0.85,
  "performance_score": 4.2,
  "communication_score": null,
  "professionalism_score": null
}
```

`null` means no data yet (same as the old NULL columns). Added signals appear as new keys automatically.

## How to Add a New Gig Signal

**Total effort: 1 file + server restart.** No other backend or frontend changes required.

### Step 1 — Create the signal file

```python
# backend/api/app/momentum/signals/attendance_streak.py
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.momentum.signals._base import Signal

SIGNAL = Signal(
    key="attendance_streak",
    label="Streak",
    short_label="Streak",
    description="Consecutive gigs completed without a no-show",
    icon="trending-up",      # any Feather icon
    color="#a78bfa",         # pick a color not already used
    weight=15.0,             # relative — auto-normalized, no constraint
    max_points=10.0,         # raw value will be divided by this (e.g. 10-gig streak = 1.0)
)

async def compute(user_id: str, db: AsyncSession) -> float | None:
    # Return None if there's no data yet for this user
    row = (await db.execute(
        text("SELECT ... FROM gig_assignments WHERE worker_id = :uid"),
        {"uid": user_id},
    )).mappings().first()
    if not row or int(row["total"]) == 0:
        return None
    return float(row["streak"])
```

### Step 2 — Restart the backend

```bash
docker compose restart kria-api
```

### Step 3 — Verify

```bash
docker exec kriya_kria-api_1 python -c "
from app.momentum import registry
print([s.key for s in registry.get_signals()])
"
```

The new signal key will appear. The next time `recalculate_momentum()` runs for any user, the new signal is computed and stored. The skill graph on mobile and Grid gains a new axis automatically. `GET /momentum/signals` returns the new signal's metadata immediately.

### What you do NOT need to change

- `calculator.py` — reads from registry at runtime
- `recalculate.py` — calls `registry.run_all()`; the new signal is included automatically
- `router.py` — `/momentum/signals` reflects registry; breakdown includes new signal
- Any DB migration — `signal_scores` JSONB accepts arbitrary keys
- Frontend mobile — `SkillGraph` reads axis count from `signalMeta` in store
- Frontend Grid — `SkillGraph` derives axes from `signals` array order in breakdown response
- `frontend/pocket/constants/momentum.ts` — static `SIGNAL_META` is only a fallback for the radar chart before the API responds; it is not the source of truth anymore

### Weight tuning tips

- Relative weights: `show_rate=35, on_time_rate=25, new_signal=15` → new normalized fractions are `35/85, 25/85, 15/85`. Existing signals each get a smaller share.
- To increase a signal's importance: raise its `weight` in the signal file. Other signals' shares decrease proportionally.
- No assert or constraint enforces the total — the registry normalizes at runtime.

## Profile Completion Signals (additive bonus, max 80 pts)

These are NOT plugin signals — they live in `config.py` and `calculator.py` because they return per-field breakdown data (earned/not-earned chips in the UI), which doesn't fit the simple `float | None` contract.

| Key | Label | Points | DB Column Type |
|-----|-------|--------|---------------|
| `id_verified` | Identity Verified | 30 | bool |
| `skills` | Skills Listed | 15 | array (non-empty) |
| `bio` | Bio Written | 10 | text (non-empty) |
| `languages` | Languages | 10 | array (non-empty) |
| `work_experience` | Work Experience | 10 | jsonb array (non-empty) |
| `education_entries` | Education | 5 | jsonb array (non-empty) |

`_is_filled()` handles: `bool`, `list/tuple` (non-empty), `str` (strip + non-empty), `None → False`.
`MAX_PROFILE_POINTS = 80` (auto-computed as sum — keeps new runners in Newcomer band).

## Penalties

| Event | Points |
|-------|--------|
| no_show | 100 |
| left_early | 50 |
| late_cancellation | 25 |
| repeated_dispute | 75 |

Penalty points stored in `momentum_profiles.worker_penalty_points`. Written by the no-show endpoint **before** calling `recalculate_momentum`.

## Backend Module (`app/momentum/`)

| File | Purpose |
|------|---------|
| `signals/_base.py` | `Signal` dataclass — key, label, short_label, description, icon, color, weight, max_points |
| `signals/*.py` | One file per gig signal — exports `SIGNAL` + `async compute(user_id, db)` |
| `registry.py` | Auto-discovery, `get_signals()`, `normalized_weights()`, `run_all()` |
| `config.py` | `PROFILE_SIGNALS`, `MAX_PROFILE_POINTS`, `WORKER_PENALTIES`, `BANDS`, `SCALE`, `CREDIBILITY_THRESHOLD` |
| `calculator.py` | Pure functions — takes `signal_scores: dict[str, float | None]` (NOT profile_row) |
| `models.py` | Pydantic response models incl. `SignalMetaResponse` |
| `router.py` | FastAPI routes — `GET /momentum/signals` + 4 score/breakdown endpoints |
| `recalculate.py` | Calls `registry.run_all()`, writes `signal_scores` JSONB, appends audit log |

**Main app wiring** (`app/main.py`):
```python
from app.momentum import router as momentum
```

## Calculator Function Signatures (updated)

```python
compute_worker_score(
    signal_scores: dict[str, float | None],
    penalty_points: int,
    gig_count: int,
    profile_fields: dict[str, Any] | None = None,
) -> MomentumScore

compute_worker_breakdown(
    signal_scores: dict[str, float | None],
    penalty_points: int,
    gig_count: int,
    profile_fields: dict[str, Any] | None = None,
) -> tuple[MomentumScore, list[BreakdownItem], list[ProfileBreakdownItem]]

compute_profile_points(
    profile_fields: dict[str, Any],
) -> tuple[int, list[ProfileBreakdownItem]]
```

`compute_worker_breakdown` returns a **3-tuple** — always unpack as `score, items, profile_items = ...`.

The old `profile_row` duck-typing is gone. Pass `signal_scores: dict` (from DB JSONB column).

## `recalculate_momentum(user_id, db, event_type, gig_id)`

Called after:
- OTP verify → gig complete (`event_type="gig_complete"`)
- No-show marked (`event_type="no_show"`)
- Worker rating submitted (`event_type="rating_received"`)

Now uses `registry.run_all(user_id, db)` to compute all signals. Results stored in `signal_scores` JSONB. Writes `worker_score + worker_gig_count + signal_scores + last_calculated_at`.

## API Endpoints

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/v1/momentum/signals` | `list[SignalMetaResponse]` — key, label, short_label, description, icon, color, weight |
| GET | `/api/v1/momentum/me` | `{ worker: MomentumScoreResponse }` |
| GET | `/api/v1/momentum/me/breakdown` | `WorkerBreakdownResponse` — score, signals[], profile_signals[], explanation |
| GET | `/api/v1/momentum/user/{id}` | `PublicMomentumResponse` — score + band only |
| GET | `/api/v1/momentum/user/{id}/breakdown` | `WorkerBreakdownResponse` — used by Grid applicant modal |

## Frontend: Mobile App

### Constants (`frontend/pocket/constants/momentum.ts`)
- `MOMENTUM_BANDS`, `getBand(score)` — unchanged
- `SIGNAL_META` — static fallback for radar axes before API responds (has `shortLabel` for each of the 5 original signals). No longer the source of truth for axis count.

### API Types (`frontend/pocket/lib/api/momentum.ts`)
- `SignalMeta` — `{ key, label, short_label, description, icon, color, weight }`
- `getSignalMeta()` — `GET /api/v1/momentum/signals`
- All existing types unchanged (`MomentumScoreData`, `BreakdownItem`, `WorkerBreakdownData`, etc.)

### Store (`frontend/pocket/stores/momentumStore.ts`)
- Added: `signalMeta: SignalMeta[]` and `fetchSignalMeta()` (cached — only fetches once, checks `length > 0`)
- `fetchSignalMeta()` called on Arena screen mount alongside `fetchMyMomentum()` + `fetchMyBreakdown()`

### SkillGraph (`components/momentum/SkillGraph.tsx`)
- Axes driven by `signalMeta` from store; falls back to `Object.keys(SIGNAL_META)` (5 keys) until API responds
- `N = axisKeys.length` — dynamic; graph automatically gains axes as signals are added
- `metaMap` merges live API meta with static fallbacks for short labels

### Components (unchanged interface)

| Component | Location | Role |
|-----------|----------|------|
| `SkillGraph` | `components/momentum/SkillGraph.tsx` | Dynamic radar chart — axes from store |
| `MomentumBreakdown` | `components/momentum/MomentumBreakdown.tsx` | Bottom sheet — signal bars + profile completion chips |
| `MomentumBadge` | `components/momentum/MomentumBadge.tsx` | Chip/stat variant for cards |

## Frontend: Grid (Host Dashboard)

### SkillGraph (`grid/components/ui/SkillGraph.tsx`)
- Axes derived from `signals: BreakdownItem[]` prop — no hardcoded `SIGNAL_KEYS` array
- `N = signals.length` — graph automatically gains axes as signals are added
- No other changes needed for new signals; API response already includes all signals

## DB Migration Chain for Momentum

| Migration | Key Changes |
|-----------|-------------|
| `0008_momentum.py` | Created `momentum_profiles` + `momentum_events` |
| `0013_momentum_rescale.py` | Score range 0–1000; signals nullable; dropped `response_rate`/`consistency_score`; added `communication_score`/`professionalism_score` |
| `0016_momentum_signal_scores.py` | ADD `signal_scores jsonb NOT NULL DEFAULT '{}'`; migrates existing individual column data into JSONB |

Old individual signal columns (`worker_show_rate` etc.) still exist in DB — not removed, not written by new code.

## To Add a New Profile Completion Signal

Profile signals live in `config.py` PROFILE_SIGNALS (not the plugin system). The DB column must already exist in `profiles`.

1. Add to `config.py` PROFILE_SIGNALS dict with `label`, `description`, `points`
2. `_is_filled()` in `calculator.py` handles bool/list/str — no changes unless new type
3. `MAX_PROFILE_POINTS` auto-recomputes; make sure total stays ≤ 99 (to keep new users in Newcomer band)

## Host Rating (NOT Momentum)

Hosts receive a `/10` rating from Runners. Simple average from `ratings` table (`rating_type = 'poster_rating'`, `score` 1–10). Not stored in `momentum_profiles`. Not shown in Momentum UI.
