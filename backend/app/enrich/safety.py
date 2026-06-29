import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import httpx

ALLOWED_SCHEMES = {"http", "https"}
MAX_REDIRECTS = 5
# Hard ceiling on any fetched body. A remote host that omits Content-Length (or
# lies about it) can't OOM the single container — we stream and abort past this.
MAX_RESPONSE_BYTES = 10 * 1024 * 1024


class UnsafeURLError(Exception):
    pass


class ResponseTooLargeError(UnsafeURLError):
    """The response body exceeded the byte ceiling (subclasses UnsafeURLError so
    existing callers that swallow UnsafeURLError treat it the same)."""


def _resolve_ips(host: str) -> list[str]:
    infos = socket.getaddrinfo(host, None)
    return [info[4][0] for info in infos]


# NOTE: validate-then-connect has a residual DNS-rebinding/TOCTOU window —
# the host is resolved here, then httpx resolves again on the actual GET, so a
# very-short-TTL attacker-controlled DNS answer could differ. Closing this fully
# needs an IP-pinned transport; accepted as a documented limitation.
def assert_safe_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise UnsafeURLError(f"scheme not allowed: {parsed.scheme!r}")
    host = parsed.hostname
    if not host:
        raise UnsafeURLError("missing host")
    try:
        ips = _resolve_ips(host)
    except OSError as exc:
        raise UnsafeURLError(f"cannot resolve host: {host}") from exc
    if not ips:
        raise UnsafeURLError(f"no addresses for host: {host}")
    for ip in ips:
        if not ipaddress.ip_address(ip).is_global:
            raise UnsafeURLError(f"non-global address {ip} for host {host}")


async def safe_get(
    client: httpx.AsyncClient, url: str, max_bytes: int = MAX_RESPONSE_BYTES
) -> httpx.Response:
    """Fetch with SSRF revalidation on every hop and a hard body-size cap.

    Streams the body so a missing/oversized Content-Length can't buffer an
    unbounded amount into memory; raises ResponseTooLargeError past `max_bytes`.
    Returns a fully-read Response (so callers keep using .text / .content)."""
    current = url
    for _ in range(MAX_REDIRECTS + 1):
        assert_safe_url(current)
        async with client.stream("GET", current, follow_redirects=False) as resp:
            if resp.is_redirect and "location" in resp.headers:
                current = urljoin(current, resp.headers["location"])
                continue
            declared = resp.headers.get("content-length")
            if declared is not None and declared.isdigit() and int(declared) > max_bytes:
                raise ResponseTooLargeError(f"response exceeds {max_bytes} bytes")
            chunks: list[bytes] = []
            total = 0
            async for chunk in resp.aiter_bytes():
                total += len(chunk)
                if total > max_bytes:
                    raise ResponseTooLargeError(f"response exceeds {max_bytes} bytes")
                chunks.append(chunk)
            # Rebuild as a complete response; drop length/encoding headers that no
            # longer describe the already-decoded, in-memory body.
            headers = [
                (k, v) for k, v in resp.headers.items()
                if k.lower() not in ("content-length", "content-encoding", "transfer-encoding")
            ]
            return httpx.Response(resp.status_code, headers=headers, content=b"".join(chunks), request=resp.request)
    raise UnsafeURLError("too many redirects")
