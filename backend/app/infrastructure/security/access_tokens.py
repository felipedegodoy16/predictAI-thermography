import base64
import hashlib
import hmac
import json
import time
from uuid import UUID

from app.core.config import settings
from app.domain.entity.user import User


def _encode_segment(value: dict[str, object]) -> str:
    raw = json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def create_access_token(user: User) -> tuple[str, int]:
    expires_in = settings.access_token_expire_minutes * 60
    now = int(time.time())
    header = _encode_segment({"alg": "HS256", "typ": "JWT"})
    payload = _encode_segment(
        {
            "sub": str(user.id),
            "email": user.email,
            "permissions": list(user.permissions),
            "iat": now,
            "exp": now + expires_in,
        }
    )
    signing_input = f"{header}.{payload}".encode("ascii")
    signature = hmac.new(
        settings.secret_key.encode("utf-8"), signing_input, hashlib.sha256
    ).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).rstrip(b"=").decode("ascii")
    return f"{header}.{payload}.{encoded_signature}", expires_in


def verify_access_token(token: str) -> dict[str, object]:
    try:
        header_segment, payload_segment, signature_segment = token.split(".")
        signing_input = f"{header_segment}.{payload_segment}".encode("ascii")
        supplied_signature = _decode_segment_bytes(signature_segment)
        expected_signature = hmac.new(
            settings.secret_key.encode("utf-8"), signing_input, hashlib.sha256
        ).digest()
        if not hmac.compare_digest(supplied_signature, expected_signature):
            raise ValueError("Invalid token signature")

        header = json.loads(_decode_segment_bytes(header_segment))
        payload = json.loads(_decode_segment_bytes(payload_segment))
        if not isinstance(header, dict) or not isinstance(payload, dict):
            raise ValueError("Invalid token structure")
        if header.get("alg") != "HS256" or header.get("typ") != "JWT":
            raise ValueError("Unsupported token")
        UUID(payload["sub"])
        if not isinstance(payload.get("email"), str):
            raise ValueError("Invalid token subject")
        if not isinstance(payload.get("permissions"), list) or not all(
            isinstance(permission, str) for permission in payload["permissions"]
        ):
            raise ValueError("Invalid token permissions")
        if not isinstance(payload.get("exp"), int) or payload["exp"] <= int(time.time()):
            raise ValueError("Expired token")
        return payload
    except (KeyError, TypeError, ValueError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("Invalid access token") from error


def _decode_segment_bytes(segment: str) -> bytes:
    padded = segment + "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))
