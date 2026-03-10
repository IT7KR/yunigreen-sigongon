"""Legacy auth compatibility shim."""

from app.core.security import (
    bearer_scheme,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_active_admin,
    get_current_user,
    get_password_hash,
    verify_password,
)

__all__ = [
    "bearer_scheme",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "get_current_active_admin",
    "get_current_user",
    "get_password_hash",
    "verify_password",
]
