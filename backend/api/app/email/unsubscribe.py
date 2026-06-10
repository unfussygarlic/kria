"""HMAC-based unsubscribe token generation and verification."""

import hashlib
import hmac

from app.config import settings


def _key() -> bytes:
    return settings.email_webhook_secret.encode()


def make_token(user_id: str, category: str) -> str:
    """Return a URL-safe hex HMAC token for the given user+category."""
    msg = f"{user_id}:{category}".encode()
    return hmac.new(_key(), msg, hashlib.sha256).hexdigest()


def verify_token(user_id: str, category: str, token: str) -> bool:
    expected = make_token(user_id, category)
    return hmac.compare_digest(expected, token)


def unsubscribe_url(user_id: str, category: str, base_url: str) -> str:
    token = make_token(user_id, category)
    return f"{base_url}/api/v1/email/unsubscribe?user_id={user_id}&category={category}&token={token}"
