---
name: sms-notifications
description: Fast2SMS OTP delivery via GoTrue SMS hook, sms_notifications module structure, how to add new templates
metadata:
  type: project
---

# SMS Notifications

## Architecture

GoTrue (Supabase Auth) intercepts OTP delivery and calls a custom FastAPI hook instead of a real SMS provider. The hook verifies the request signature and forwards the OTP to Fast2SMS.

```
Pocket → supabase.auth.signInWithOtp({ phone })
       → GoTrue generates OTP
       → GoTrue calls POST https://api.trykria.com/api/v1/sms/hook  (HMAC-signed)
       → FastAPI verifies signature → looks up template → calls Fast2SMS bulkV2
       → User receives SMS
```

Supabase dashboard config: **Authentication → Hooks → Send SMS**
- URL: `https://api.trykria.com/api/v1/sms/hook`
- Signing secret: same value as `GOTRUE_HOOK_SECRET` in `.env.prod`

**No Twilio.** Phone provider has Twilio credentials set (couldn't be removed from dashboard) but the hook bypasses them entirely — Twilio is never called.

## Module Location

`backend/api/app/sms_notifications/`

| File | Purpose |
|------|---------|
| `__init__.py` | Exports `send_sms()` |
| `templates.py` | Template registry — **add new templates here** |
| `sender.py` | Fast2SMS API call (`POST /dev/bulkV2`, DLT route) |
| `hook.py` | GoTrue webhook endpoint (`POST /api/v1/sms/hook`) |

## Adding a New Template

**Step 1** — Register the template in Fast2SMS dashboard and get DLT approval (you'll receive a 6-digit Message ID).

**Step 2** — Add an entry to `templates.py`:
```python
"application_accepted": SmsTemplate(
    sender_id="WAGIFY",   # your DLT sender ID
    message_id="789012",  # 6-digit Message ID from Fast2SMS dashboard
),
```

**Step 3** — Call from anywhere in the app:
```python
from app.sms_notifications import send_sms

await send_sms("application_accepted", mobile_10, ["Rahul", "Food Stall Helper"])
```

`variables` list maps to `{#var#}` placeholders in the DLT template body, in order.

## Fast2SMS API Details

```
POST https://www.fast2sms.com/dev/bulkV2
Header: authorization: <FAST2SMS_API_KEY>

{
  "route": "dlt",
  "sender_id": "<from template>",
  "message": "<6-digit message_id from template>",
  "variables_values": "<var1>|<var2>|",   ← pipe-separated, trailing pipe required
  "numbers": "<10-digit mobile>"           ← no country code
}
```

Response: `{ "return": true/false, "request_id": "..." }`

## Phone Normalisation

GoTrue delivers E.164 (`+91XXXXXXXXXX`). Fast2SMS expects bare 10-digit number.
```python
mobile_10 = phone.lstrip("+").removeprefix("91")
```

## Signature Verification (standard-webhooks HMAC-SHA256)

- Secret format: `v1,whsec_<base64>`
- Signed content: `<webhook-id>.<webhook-timestamp>.<raw body>`
- Header: `webhook-signature: v1,<base64_sig>`
- If `GOTRUE_HOOK_SECRET` is empty (dev), verification is skipped with a warning log

## Env Vars

| Var | Where set | Notes |
|-----|-----------|-------|
| `FAST2SMS_API_KEY` | `.env.prod` | From fast2sms.com/dashboard/dev-api |
| `GOTRUE_HOOK_SECRET` | `.env.prod` | `v1,whsec_<openssl rand -base64 32>`; also pasted into Supabase hook config |
| `GOTRUE_HOOK_SEND_SMS_ENABLED` | `.env.prod` | `true` in prod, `false` (default) in dev |
| `SMS_AUTOCONFIRM` | `.env.prod` | `false` in prod, `true` in dev (hook never fires in dev) |

Template `sender_id` and `message_id` are **code, not env vars** — they live in `templates.py` since they're not secrets and vary per template.

## Dev Behaviour

`SMS_AUTOCONFIRM=true` in dev → GoTrue auto-accepts any OTP without calling the hook. Pocket uses mock OTP `123456` in dev. The hook endpoint exists but is never triggered locally.
