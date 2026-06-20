"""SMS hook endpoint — called by GoTrue (Supabase Auth) instead of a real SMS provider.

GoTrue is configured with:
  GOTRUE_HOOK_SEND_SMS_ENABLED=true
  GOTRUE_HOOK_SEND_SMS_URI=http://kria-api:8000/api/v1/sms/hook
  GOTRUE_HOOK_SEND_SMS_SECRETS=v1,whsec_<base64>

GoTrue signs every request using the standard-webhooks HMAC-SHA256 scheme.
We verify the signature here before forwarding the OTP to Fast2SMS.

Fast2SMS bulkV2 DLT API:
  POST https://www.fast2sms.com/dev/bulkV2
  Header: authorization: <api_key>
  Body:   { route, sender_id, message, variables_values, numbers }

  - route:            "dlt"
  - sender_id:        DLT-registered sender ID (FAST2SMS_SENDER_ID)
  - message:          6-digit DLT Message ID (FAST2SMS_MESSAGE_ID)
  - variables_values: OTP value followed by "|" (pipe-separated template vars)
  - numbers:          10-digit mobile number

Phone normalisation: GoTrue delivers E.164 (+91XXXXXXXXXX).
Fast2SMS expects the bare 10-digit mobile number.
"""

import base64
import hashlib
import hmac
import logging

import httpx
from fastapi import APIRouter, Header, HTTPException, Request

from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sms", tags=["sms"])

FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"


# ── Signature verification ────────────────────────────────────────────────────

def _verify_signature(
    body: bytes,
    msg_id: str,
    timestamp: str,
    signature_header: str,
    secret: str,
) -> bool:
    """Verify a standard-webhooks HMAC-SHA256 signature.

    Signed content:  "<webhook-id>.<webhook-timestamp>.<raw body>"
    Secret encoding: "v1,whsec_<base64-encoded bytes>"
    Signature header may contain multiple space-separated "v1,<sig>" tokens.
    """
    if not secret:
        # Hook secret not configured — skip (dev/test only).
        logger.warning("SMS hook secret not set; skipping signature verification.")
        return True

    try:
        raw_secret = base64.b64decode(secret.removeprefix("v1,whsec_"))
    except Exception:
        logger.error("SMS hook secret is not valid base64.")
        return False

    signed_content = f"{msg_id}.{timestamp}.{body.decode()}"
    expected = base64.b64encode(
        hmac.new(raw_secret, signed_content.encode(), hashlib.sha256).digest()
    ).decode()

    return any(
        hmac.compare_digest(f"v1,{expected}", sig)
        for sig in signature_header.split(" ")
        if sig
    )


# ── Fast2SMS call ─────────────────────────────────────────────────────────────

async def _send_via_fast2sms(mobile_10: str, otp: str) -> None:
    """Send OTP via Fast2SMS bulkV2 DLT route.  Raises HTTPException on failure."""
    if not settings.fast2sms_api_key:
        raise HTTPException(status_code=503, detail="SMS provider not configured.")
    if not settings.fast2sms_sender_id or not settings.fast2sms_message_id:
        raise HTTPException(status_code=503, detail="SMS DLT sender/message not configured.")

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            FAST2SMS_URL,
            headers={
                "authorization": settings.fast2sms_api_key,
                "Content-Type": "application/json",
            },
            json={
                "route": "dlt",
                "sender_id": settings.fast2sms_sender_id,
                "message": settings.fast2sms_message_id,
                "variables_values": f"{otp}|",
                "numbers": mobile_10,
            },
        )

    if resp.status_code != 200:
        logger.error("Fast2SMS error %s: %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="SMS delivery failed.")

    result = resp.json()
    # Fast2SMS returns { "return": true/false, "request_id": "...", ... }
    if not result.get("return"):
        logger.error("Fast2SMS rejected OTP: %s", result)
        raise HTTPException(status_code=502, detail="SMS delivery rejected.")


# ── Hook endpoint ─────────────────────────────────────────────────────────────

@router.post("/hook", status_code=200)
async def sms_hook(
    request: Request,
    webhook_id: str = Header(default="", alias="webhook-id"),
    webhook_timestamp: str = Header(default="", alias="webhook-timestamp"),
    webhook_signature: str = Header(default="", alias="webhook-signature"),
) -> dict:
    """Receive GoTrue's send-SMS hook, verify it, and forward OTP to Fast2SMS."""
    body = await request.body()

    if not _verify_signature(
        body, webhook_id, webhook_timestamp, webhook_signature,
        settings.gotrue_hook_secret,
    ):
        logger.warning("SMS hook: invalid signature — rejecting request.")
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")

    payload = await request.json()
    phone: str = (payload.get("user") or {}).get("phone") or ""
    otp: str = (payload.get("sms") or {}).get("otp") or ""

    if not phone or not otp:
        logger.error("SMS hook: missing phone or OTP in payload: %s", payload)
        raise HTTPException(status_code=400, detail="Missing phone or OTP.")

    # Strip country code — Fast2SMS expects 10-digit Indian mobile numbers.
    mobile_10 = phone.lstrip("+").removeprefix("91")
    if len(mobile_10) != 10 or not mobile_10.isdigit():
        logger.error("SMS hook: unexpected phone format: %s", phone)
        raise HTTPException(status_code=400, detail=f"Unsupported phone format: {phone}")

    await _send_via_fast2sms(mobile_10, otp)
    logger.info("SMS OTP delivered via Fast2SMS to +91%s", mobile_10)

    # GoTrue expects an empty 200 to consider the hook successful.
    return {}
