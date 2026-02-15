from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt

from app.config import settings

bearer_scheme = HTTPBearer()


def _decode_token(token: str) -> dict:
    """Validate a Supabase-issued JWT and return its payload."""
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            # Supabase sets audience to "authenticated" for logged-in users
            options={"verify_aud": False},
        )
        return payload
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
