---
name: email-notifications
description: Email notification system for Grid hosts — first application, burst, profile reminders
metadata:
  type: project
---

# Email Notifications

## Architecture

Applications are created directly via Supabase from Pocket mobile (no FastAPI apply endpoint exists). Email triggers are hooked via **Supabase Database Webhook** → internal FastAPI endpoint.

## Trigger Flow

1. Runner applies → Supabase inserts row into `gig_applications`
2. Supabase webhook fires `POST /api/v1/email/internal/application-created` with the inserted row
3. FastAPI checks `X-Webhook-Secret` header, then calls `notify_first_application()` + `check_and_notify_burst()`

**⚠️ Supabase webhook must be configured manually** (can't be done via code):
- Supabase dashboard → Database → Webhooks → Create
- Table: `gig_applications`, event: `INSERT`
- URL: `https://<api-domain>/api/v1/email/internal/application-created`
- Header: `X-Webhook-Secret: <EMAIL_WEBHOOK_SECRET from .env.prod>`

## Email Types

| Type | Trigger | Guard |
|------|---------|-------|
| First application | First `gig_applications` INSERT for a gig | `gigs.first_application_notified` flipped to TRUE after send |
| Burst | 5+ applications in 30 minutes | `gigs.last_burst_email_at` cooldown of 6 hours |
| Profile reminder | Daily cron at 09:00 UTC | 14-day interval, max 4 sends, respects `email_unsubscribes` table |

## File Locations

```
backend/api/app/email/
  __init__.py
  client.py          — send_email() wrapping Resend SDK
  unsubscribe.py     — HMAC-SHA256 token generation + verification
  templates.py       — HTML templates for all 3 email types + unsubscribe page
  notifications.py   — notify_first_application(), check_and_notify_burst(), send_profile_reminders()

backend/api/app/routers/email.py
  POST /api/v1/email/internal/application-created   — webhook receiver
  GET  /api/v1/email/unsubscribe                    — one-click unsubscribe page
```

## Env Vars (prod)

- `RESEND_API_KEY` — from Resend dashboard
- `EMAIL_WEBHOOK_SECRET` — shared secret between Supabase webhook and FastAPI
- `APP_BASE_URL=https://grid.trykria.com` — used in email button links and unsubscribe URLs

## Provider

Resend (`noreply@trykria.com`). Domain `trykria.com` verified in Resend dashboard.

## DB Tables (migration 0028)

- `gigs.first_application_notified` — dedup guard
- `gigs.last_burst_email_at` — burst cooldown
- `email_unsubscribes (user_id, category)` — unsubscribe registry
- `profile_reminder_log (user_id, last_sent_at, send_count)` — reminder frequency tracking

**Why:** How to apply: always check `email_unsubscribes` before sending reminders; never skip `first_application_notified` check or hosts get duplicate "first" emails.
