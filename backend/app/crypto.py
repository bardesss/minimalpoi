import base64
import hashlib

from cryptography.fernet import Fernet

from .config import get_secret_key


def _fernet() -> Fernet:
    # Derive a stable 32-byte Fernet key from the app secret.
    digest = hashlib.sha256(get_secret_key().encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt(token: str) -> str:
    return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
