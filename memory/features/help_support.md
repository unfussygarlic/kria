---
name: help-support
description: Help & Support feature for Grid — FAQ accordion + categorized query form + My Tickets tracking; queries stored in support_queries table with Resend admin notification; managed via Admin Dashboard
metadata:
  type: project
---

# Help & Support

A page in Grid where Hosts can browse FAQs, submit categorized support queries, and track previous tickets.

---

## Location

Accessible via **TopBar profile dropdown** (between Settings and the Sign Out divider). Route: `/support`.

**File:** `frontend/grid/app/(dashboard)/support/page.tsx`
**API helpers:** `frontend/grid/lib/api/support.ts`

---

## Page Layout

### Two tabs: FAQ and My Tickets

**Tab 1 — FAQ Accordion**
Hardcoded — no backend fetch. 4 sections:
- Getting Started
- Gigs & Applications
- Momentum & Ratings
- Account & Billing

Each section = collapsible `FaqItem` accordion. Chevron rotates on expand.

**Tab 2 — My Tickets**
Shows submitted tickets fetched from `GET /api/v1/support/my-tickets`. Tab badge shows count when > 0.

Each ticket rendered as `TicketRow` — expandable to show full message + admin response ("Response from Kria") if `admin_note` is set. Status chip: `open` (grey) / `in_progress` (amber) / `resolved` (lime).

Auto-fetches on mount. Refreshes ticket list after form submit so new ticket appears immediately.

---

### Submit a Query form (bottom of FAQ tab)

**Form fields:**
- **Category** (required dropdown): 7 options
- **Subject** (required text input, max 120 chars)
- **Message** (required textarea, max 2000 chars with character counter)
- **Email** (pre-filled from profile, editable)
- **Submit** → success state replaces form with confirmation + "View my tickets" link + "Submit another" to reset

**Query Categories** (match backend `CATEGORY_LABELS`):
```
account   → Account & Profile
gigs      → Gigs & Applications
checkin   → Check-in & OTP
payments  → Payments & Billing
runners   → Runners & Ratings
technical → Technical Issue
other     → Other
```

---

## Backend

### Database

`support_queries` table (migration 0030):
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL  -- always set now (stored on submit)
category    TEXT NOT NULL
subject     TEXT NOT NULL
message     TEXT NOT NULL
email       TEXT NOT NULL
status      TEXT NOT NULL DEFAULT 'open'  -- open | in_progress | resolved
admin_note  TEXT
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()  -- auto-updated via trigger
```

**Note:** Old tickets (submitted before `user_id` was added to the INSERT) have `user_id = NULL`. The `GET /my-tickets` query handles this via email fallback.

### FastAPI Endpoints

**Submit:**
`POST /api/v1/support/submit`
- Auth: `CurrentUser`
- Stores `user_id` from JWT + all form fields
- Sends Resend notification to `coreofkria@gmail.com`
- Sends ack email to submitter

**My Tickets:**
`GET /api/v1/support/my-tickets`
- Auth: `CurrentUser`
- Returns tickets where `user_id = :uid OR (user_id IS NULL AND email = profile.email)`
- Two distinct param names `uid` and `uid2` (same UUID) — required to avoid asyncpg named-param deduplication bug

```python
WHERE sq.user_id = :uid
   OR (sq.user_id IS NULL AND sq.email = (
       SELECT email FROM profiles WHERE id = :uid2
   ))
```

**Resolve (Admin Dashboard → FastAPI):**
`PATCH /admin/support/tickets/{ticket_id}`
- Auth: `require_admin` (`AdminUser`)
- Updates `status`, `admin_note`
- Sends Resend resolve email to submitter

### TypeScript API helper (`lib/api/support.ts`)

```typescript
export interface MyTicket {
  id: string; category: string; subject: string; message: string;
  status: "open" | "in_progress" | "resolved";
  admin_note: string | null;
  created_at: string; updated_at: string;
}
export async function submitSupportQuery(payload: SupportSubmitPayload): Promise<{ ok: boolean }>
export async function getMyTickets(): Promise<MyTicket[]>
```

### Email Notification (to admin on new ticket)

Subject: `[Support] {category_label}: {subject}`
To: `coreofkria@gmail.com`; From: `noreply@trykria.com`

### Resolve Email (to submitter)

Sent by `PATCH /admin/support/tickets/{id}` when admin resolves via Admin Dashboard.

---

## Admin Management

Tickets managed in **Admin Dashboard → Support Tickets** (Phase 1 — see [[admin-progress]]).

Flow:
1. Host submits → `support_queries` row + Resend to admin
2. Admin opens Tickets → split-panel list/detail, category chips, status filter tabs
3. Admin clicks ticket → reads message, writes optional note, clicks Resolve or In Progress
4. `PATCH /admin/support/tickets/{id}` via `apiPatch()` → status + admin_note → Resend email fires
5. Host sees "Response from Kria" in their My Tickets tab

---

## Grid Build Fixes (related, 2026-06-21)

Two Next.js pages needed `export const dynamic = "force-dynamic"` to prevent static prerender crash when Supabase env vars are absent at build time:
- `frontend/grid/app/login/layout.tsx`
- `frontend/grid/app/auth/confirm/layout.tsx`

See [[debugging]] for the full pattern.
