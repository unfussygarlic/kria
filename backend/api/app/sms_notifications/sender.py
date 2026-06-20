"""Fast2SMS delivery layer.

send_sms(template_key, mobile_10, variables) is the single function to call
from anywhere in the app to send an SMS notification.

variables: list of values that map to {#var#} placeholders in the DLT template,
           in order. e.g. ["123456"] for a single OTP variable.
"""

import logging

import httpx
from fastapi import HTTPException

from app.config import settings
from app.sms_notifications.templates import TEMPLATES

logger = logging.getLogger(__name__)

FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"


async def send_sms(template_key: str, mobile_10: str, variables: list[str]) -> None:
    """Send an SMS via Fast2SMS using a registered DLT template.

    Raises HTTPException on misconfiguration or delivery failure so callers
    get a clean error without needing to inspect the response themselves.
    """
    if not settings.fast2sms_api_key:
        raise HTTPException(status_code=503, detail="SMS provider not configured.")

    template = TEMPLATES.get(template_key)
    if template is None:
        raise HTTPException(status_code=500, detail=f"Unknown SMS template: '{template_key}'.")
    if not template.sender_id or not template.message_id:
        raise HTTPException(
            status_code=503,
            detail=f"SMS template '{template_key}' is missing sender_id or message_id.",
        )

    # Fast2SMS expects pipe-separated variable values, trailing pipe required.
    variables_values = "|".join(variables) + "|"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            FAST2SMS_URL,
            headers={
                "authorization": settings.fast2sms_api_key,
                "Content-Type": "application/json",
            },
            json={
                "route": "dlt",
                "sender_id": template.sender_id,
                "message": template.message_id,
                "variables_values": variables_values,
                "numbers": mobile_10,
            },
        )

    if resp.status_code != 200:
        logger.error("Fast2SMS error %s for template '%s': %s", resp.status_code, template_key, resp.text)
        raise HTTPException(status_code=502, detail="SMS delivery failed.")

    result = resp.json()
    if not result.get("return"):
        logger.error("Fast2SMS rejected template '%s': %s", template_key, result)
        raise HTTPException(status_code=502, detail="SMS delivery rejected.")

    logger.info("SMS '%s' delivered via Fast2SMS to +91%s", template_key, mobile_10)
