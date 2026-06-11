"""Expo Push Notifications HTTP client.

Sends to the Expo Push API endpoint. No SDK needed — plain httpx POST.
Silently skips if token is missing or invalid (device uninstalled etc.).
"""

import logging

import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push(
    *,
    token: str,
    title: str,
    body: str,
    data: dict | None = None,
    sound: str = "default",
) -> bool:
    """Send a single push notification. Returns True on success."""
    if not token or not token.startswith("ExponentPushToken"):
        logger.debug("Skipping push — invalid or missing token: %r", token)
        return False

    payload = {
        "to": token,
        "title": title,
        "body": body,
        "sound": sound,
        "data": data or {},
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                EXPO_PUSH_URL,
                json=payload,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
            )
            result = resp.json()
            # Expo returns {"data": {"status": "ok"}} or {"data": {"status": "error", ...}}
            status = result.get("data", {}).get("status")
            if status == "error":
                logger.warning("Expo push error for token %s: %s", token, result)
                return False
            return True
    except Exception:
        logger.exception("Failed to send push notification to %s", token)
        return False
