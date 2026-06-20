"""SMS template registry.

To add a new template:
  1. Register it in the Fast2SMS dashboard (DLT-approved).
  2. Add an entry to TEMPLATES below with the sender_id and message_id.
  3. Call send_sms("<your_key>", mobile_10, ["var1", "var2", ...]) from anywhere in the app.

variables_values maps to {#var#} placeholders in the DLT template body, in order.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class SmsTemplate:
    sender_id: str
    message_id: str  # 6-digit DLT Message ID from Fast2SMS dashboard


# ── Template registry ─────────────────────────────────────────────────────────
# Key          → used as the first arg to send_sms()
# sender_id    → DLT-registered sender ID
# message_id   → 6-digit Message ID from the Fast2SMS dashboard template list

TEMPLATES: dict[str, SmsTemplate] = {
    "otp": SmsTemplate(
        sender_id="WAGIFY",   # e.g. "WAGIFY"  — fill in your DLT sender ID
        message_id="213309",  # e.g. "123456"  — fill in your OTP template Message ID
    ),

    # Future templates — uncomment and fill in once registered on DLT:
    # "application_accepted": SmsTemplate(
    #     sender_id="",
    #     message_id="",
    # ),
    # "application_rejected": SmsTemplate(
    #     sender_id="",
    #     message_id="",
    # ),
    # "new_jobs_nearby": SmsTemplate(
    #     sender_id="",
    #     message_id="",
    # ),
    # "shift_reminder": SmsTemplate(
    #     sender_id="",
    #     message_id="",
    # ),
}
