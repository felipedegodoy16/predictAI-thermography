import base64
import hashlib
import hmac
import json
import time
from datetime import datetime, timedelta, timezone

from app.core.config import Settings


def create_password_reset_token(
    email: str, settings: Settings
) -> tuple[str, datetime]:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(
        minutes=settings.reset_password_token_expire_minutes
    )
    header = _encode_segment({"alg": settings.algorithm, "typ": "JWT"})
    payload = _encode_segment(
        {
            "sub": email,
            "iat": int(now.timestamp()),
            "exp": int(expires_at.timestamp()),
            "scope": "password_reset",
        }
    )
    signing_input = f"{header}.{payload}".encode("ascii")
    signature = hmac.new(
        settings.secret_key.encode("utf-8"), signing_input, hashlib.sha256
    ).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).rstrip(b"=").decode("ascii")
    return f"{header}.{payload}.{encoded_signature}", expires_at


def verify_password_reset_token(
    token: str, settings: Settings
) -> tuple[str, datetime] | None:
    if len(token) > 4096:
        return None
    try:
        header_segment, payload_segment, signature_segment = token.split(".")
        signing_input = f"{header_segment}.{payload_segment}".encode("ascii")
        supplied_signature = _decode_segment(signature_segment)
        expected_signature = hmac.new(
            settings.secret_key.encode("utf-8"), signing_input, hashlib.sha256
        ).digest()
        if not hmac.compare_digest(supplied_signature, expected_signature):
            return None

        header = json.loads(_decode_segment(header_segment))
        payload = json.loads(_decode_segment(payload_segment))
        if not isinstance(header, dict) or header.get("alg") != settings.algorithm:
            return None
        if header.get("typ") != "JWT" or not isinstance(payload, dict):
            return None
        if payload.get("scope") != "password_reset":
            return None

        email = payload.get("sub")
        issued_at = payload.get("iat")
        expires_at = payload.get("exp")
        if not isinstance(email, str):
            return None
        if not isinstance(issued_at, int) or not isinstance(expires_at, int):
            return None
        now = int(time.time())
        max_lifetime = settings.reset_password_token_expire_minutes * 60
        if issued_at > now or expires_at <= now or expires_at <= issued_at:
            return None
        if expires_at - issued_at > max_lifetime:
            return None

        return email, datetime.fromtimestamp(expires_at, tz=timezone.utc)
    except (ValueError, TypeError, UnicodeDecodeError, json.JSONDecodeError):
        return None


def hash_password_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _encode_segment(value: dict[str, object]) -> str:
    encoded = json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64.urlsafe_b64encode(encoded).rstrip(b"=").decode("ascii")


def _decode_segment(segment: str) -> bytes:
    padded_segment = segment + "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(padded_segment.encode("ascii"))
