import threading
import time
from typing import Annotated, Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.config import settings
from app.db.session import get_db

bearer_scheme = HTTPBearer()

# JWKS cache — refreshed every hour, handles Supabase key rotations automatically
_jwks_cache: dict[str, Any] | None = None
_jwks_lock = threading.Lock()
_jwks_last_fetch: float = 0
_JWKS_TTL = 3600  # seconds


def _get_jwks() -> dict[str, Any]:
    global _jwks_cache, _jwks_last_fetch
    if _jwks_cache is None or (time.monotonic() - _jwks_last_fetch) > _JWKS_TTL:
        with _jwks_lock:
            if _jwks_cache is None or (time.monotonic() - _jwks_last_fetch) > _JWKS_TTL:
                resp = httpx.get(
                    f"{settings.supabase_url}/auth/v1/.well-known/jwks.json",
                    timeout=5.0,
                )
                resp.raise_for_status()
                _jwks_cache = resp.json()
                _jwks_last_fetch = time.monotonic()
    return _jwks_cache  # type: ignore[return-value]


def _decode_token(token: str) -> dict:
    """Validate a Supabase-issued JWT and return its payload."""
    # Primary path: verify against JWKS (current ES256/ECC P-256 keys)
    try:
        return jwt.decode(
            token,
            _get_jwks(),
            algorithms=["ES256", "RS256"],
            options={"verify_aud": False},
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        pass  # JWKS fetch failed or key mismatch — fall through to legacy

    # Legacy fallback: HS256 shared secret for tokens issued before key rotation
    try:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


class AuthenticatedUser:
    """Extracted user info from a validated Supabase JWT."""

    def __init__(self, user_id: str, phone: str | None, role: str):
        self.user_id = user_id
        self.phone = phone
        self.role = role

    def __repr__(self) -> str:
        return f"AuthenticatedUser(user_id={self.user_id!r}, role={self.role!r})"


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> AuthenticatedUser:
    payload = _decode_token(credentials.credentials)

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )

    return AuthenticatedUser(
        user_id=user_id,
        phone=payload.get("phone"),
        role=payload.get("role", "authenticated"),
    )


# Convenience type alias for dependency injection
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]


async def require_admin(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AuthenticatedUser:
    """Dependency that rejects non-admin users with 403."""
    row = await db.execute(
        text("SELECT is_admin FROM profiles WHERE id = :uid"),
        {"uid": current_user.user_id},
    )
    result = row.fetchone()
    if not result or not result.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


AdminUser = Annotated[AuthenticatedUser, Depends(require_admin)]
