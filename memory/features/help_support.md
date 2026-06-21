---
name: help-support
description: Help & Support feature for Grid — FAQ accordion + categorized query submission form; queries stored in support_queries table with Resend admin notification; managed via Admin Dashboard
metadata:
  type: project
---

# Help & Support

A page in Grid where Hosts can browse FAQs and submit categorized support queries. Managed from the Admin Dashboard.

---

## Location

Accessible via **TopBar profile dropdown** (between Settings and the Sign Out divider). Route: `/support`.

---

## Page Layout

### Top: FAQ Accordion
Hardcoded in the component — no backend fetch needed. Grouped by category with collapsible sections.

**FAQ Categories:**
- Getting Started
- Gigs & Events
- Runners & Applications
- Payments & Billing
- Account & Profile

Each group = one accordion section. Expand/collapse with chevron. Only one section open at a time (optional — can allow multiple).

### Bottom: Submit a Query

**Form fields:**
- **Category** (required dropdown): 7 options listed below
- **Subject** (required text input, max 120 chars)
- **Message** (required textarea, max 1000 chars)
- **Email** (pre-filled from profile, editable)
- **Submit** button → success state shows confirmation message ("We'll get back to you within 24 hours")

**Query Categories:**
1. Gig Posting
2. Runner & Applications
3. Payments & Billing
4. Account & Profile
5. Bug Report
6. Feature Request
7. Other

---

## Backend

### Database

`support_queries` table (new migration):
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL
category    TEXT NOT NULL  -- one of the 7 categories above
subject     TEXT NOT NULL
message     TEXT NOT NULL
email       TEXT NOT NULL  -- submitter's email for reply
status      TEXT NOT NULL DEFAULT 'open'  -- open | in_progress | resolved
admin_note  TEXT  -- written by admin when resolving
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()
```

### FastAPI Endpoints

**Submit (Grid → FastAPI):**
`POST /api/v1/support/submit`
- Auth: `CurrentUser` (must be logged in as host)
- Inserts row to `support_queries`
- Sends Resend email notification to admin inbox with category, subject, message, submitter email

**Resolve (Admin Dashboard → FastAPI):**
`PATCH /admin/support/{id}/resolve`
- Auth: `require_admin`
- Updates `status` → `resolved`, sets `admin_note`
- Sends Resend "resolved" email to submitter including admin note

### Email Notification (to admin on new ticket)

Subject: `[Kria Support] {category} — {subject}`
Body: submitter email, category, full message, link to Admin Dashboard ticket.
From: `noreply@trykria.com` → To: `vs.therojgaar@gmail.com`

### Resolve Email (to submitter)

Subject: `Re: {subject} — Your Kria support query`
Body: confirmation that query is resolved + admin note if provided.
From: `support@trykria.com` (or `noreply@trykria.com`)

---

## Admin Management

Tickets are managed in **Admin Dashboard → Support Tickets** section (Phase 1 of [[admin-plan]]).

Flow:
1. Host submits → row created in `support_queries` + Resend email to admin
2. Admin opens Admin Dashboard → Support Tickets → sees all open tickets
3. Admin clicks ticket → reads message, writes optional reply note, clicks "Resolve"
4. `PATCH /admin/support/{id}/resolve` → status → `resolved` → Resend email to host

---

## Build Status

Part of Admin Dashboard Phase 1 — see [[admin-progress]] for task tracking.
