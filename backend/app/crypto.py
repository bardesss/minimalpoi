import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from .config import get_secret_key


class DecryptError(Exception):
    """A stored ciphertext could not be decrypted (usually the secret key changed
    or was lost). Callers should surface a 're-enter the credential' message
    instead of leaking an opaque 500."""


def _fernet() -> Fernet:
    # Derive a stable 32-byte Fernet key from the app secret.
    digest = hashlib.sha256(get_secret_key().encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise DecryptError("could not decrypt stored credential") from exc
