"""GoTrue SMS hook endpoint.

GoTrue (Supabase Auth) calls POST /api/v1/sms/hook instead of a real SMS
provider. Every request is HMAC-SHA256 signed using the standard-webhooks
scheme — we verify the signature before processing.

GoTrue configuration (set in Supabase Dashboard → Authentication → Hooks):
  URL:    https://api.trykria.com/api/v1/sms/hook
  Secret: same value as GOTRUE_HOOK_SECRET in .env.prod
"""

import base64
import hashlib
import hmac
import logging

from fastapi import APIRouter, Header, HTTPException, Request

from app.config import settings
from app.sms_notifications.sender import send_sms

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sms", tags=["sms"])


def _verify_signature(
    body: bytes,
    msg_id: str,
    timestamp: str,
    signature_header: str,
    secret: str,
) -> bool:
    """Verify a standard-webhooks HMAC-SHA256 signature.

    Signed content:  "<webhook-id>.<webhook-timestamp>.<raw body>"
    Secret format:   "v1,whsec_<base64-encoded bytes>"
    Signature header may contain multiple space-separated "v1,<sig>" tokens.
    """
    if not secret:
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


@router.post("/hook", status_code=200)
async def sms_hook(
    request: Request,
    webhook_id: str = Header(default="", alias="webhook-id"),
    webhook_timestamp: str = Header(default="", alias="webhook-timestamp"),
    webhook_signature: str = Header(default="", alias="webhook-signature"),
) -> dict:
    """Receive GoTrue's send-SMS hook, verify it, and deliver OTP via Fast2SMS."""
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

    # GoTrue delivers E.164 (+91XXXXXXXXXX); Fast2SMS expects 10-digit number.
    mobile_10 = phone.lstrip("+").removeprefix("91")
    if len(mobile_10) != 10 or not mobile_10.isdigit():
        logger.error("SMS hook: unexpected phone format: %s", phone)
        raise HTTPException(status_code=400, detail=f"Unsupported phone format: {phone}")

    await send_sms("otp", mobile_10, [otp])

    # GoTrue expects an empty 200 to consider the hook successful.
    return {}
