import asyncio
import ipaddress
from urllib.parse import urljoin

import httpx

ALLOWED_SCHEMES = {"http", "https"}
MAX_REDIRECTS = 5
# Hard ceiling on any fetched body. A remote host that omits Content-Length (or
# lies about it) can't OOM the single container — we stream and abort past this.
MAX_RESPONSE_BYTES = 10 * 1024 * 1024
# Wall-clock budget for a whole safe_get (DNS + every redirect hop + body). The
# per-read client timeout alone lets a server drip one byte at a time forever.
FETCH_DEADLINE_S = 20
# NAT64 prefixes embed an IPv4 address (incl. loopback/private/metadata) that a
# NAT64 gateway would translate to, so they are never "public" for us.
_NAT64_NETS = (ipaddress.ip_network("64:ff9b::/96"), ipaddress.ip_network("64:ff9b:1::/48"))


class UnsafeURLError(Exception):
    pass


class ResponseTooLargeError(UnsafeURLError):
    """The response body exceeded the byte ceiling (subclasses UnsafeURLError so
    existing callers that swallow UnsafeURLError treat it the same)."""


class FetchDeadlineError(UnsafeURLError):
    """The whole fetch exceeded FETCH_DEADLINE_S (an UnsafeURLError so callers
    that swallow UnsafeURLError treat it the same)."""


async def _resolve_ips(host: str) -> list[str]:
    # The loop's getaddrinfo runs in the default executor: no event-loop stall.
    infos = await asyncio.get_running_loop().getaddrinfo(host, None)
    return [info[4][0] for info in infos]


def _is_public(ip: str) -> bool:
    addr = ipaddress.ip_address(ip)
    if isinstance(addr, ipaddress.IPv6Address) and any(addr in net for net in _NAT64_NETS):
        return False
    return addr.is_global


def _parse(url: str) -> httpx.URL:
    try:
        return httpx.URL(url)
    except httpx.InvalidURL as exc:
        raise UnsafeURLError(f"invalid url: {url!r}") from exc


async def assert_safe_url(url: str, *, allow_private: bool = False) -> list[str]:
    """Validate scheme + host and return the resolved IPs. Every IP must be
    public unless `allow_private` (which skips only that public-IP check)."""
    parsed = _parse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise UnsafeURLError(f"scheme not allowed: {parsed.scheme!r}")
    host = parsed.raw_host.decode("ascii")
    if not host:
        raise UnsafeURLError("missing host")
    try:
        ips = await _resolve_ips(host)
    except OSError as exc:
        raise UnsafeURLError(f"cannot resolve host: {host}") from exc
    if not ips:
        raise UnsafeURLError(f"no addresses for host: {host}")
    if not allow_private:
        for ip in ips:
            if not _is_public(ip):
                raise UnsafeURLError(f"non-global address {ip} for host {host}")
    return ips


async def safe_get(
    client: httpx.AsyncClient,
    url: str,
    max_bytes: int = MAX_RESPONSE_BYTES,
    *,
    allow_private: bool = False,
) -> httpx.Response:
    """Fetch with SSRF revalidation on every hop, IP pinning, a hard body-size
    cap and an overall deadline.

    Each hop is resolved once, validated, then connected to the first validated
    IP: the URL host is swapped for the IP while `Host` and TLS SNI keep the
    original name (so the certificate is still verified against it). A
    DNS-rebinding answer on a second lookup therefore can't steer the
    connection. The body is streamed so a missing/oversized Content-Length
    can't buffer an unbounded amount into memory. Raises ResponseTooLargeError
    past `max_bytes` and FetchDeadlineError past FETCH_DEADLINE_S. Returns a
    fully-read Response whose `.url` is the original hostname URL, so callers
    keep using .url / .text / .content.

    `allow_private` skips only the public-IP check, and only for hops on the
    original URL's host; a redirect to any other host gets the full check."""
    try:
        async with asyncio.timeout(FETCH_DEADLINE_S):
            return await _get(client, url, max_bytes, allow_private)
    except TimeoutError as exc:
        raise FetchDeadlineError(f"fetch exceeded {FETCH_DEADLINE_S}s") from exc


async def _get(client: httpx.AsyncClient, url: str, max_bytes: int, allow_private: bool) -> httpx.Response:
    origin_host = _parse(url).raw_host
    current = url
    for _ in range(MAX_REDIRECTS + 1):
        target = _parse(current)
        ips = await assert_safe_url(current, allow_private=allow_private and target.raw_host == origin_host)
        pinned = target.copy_with(host=ips[0])  # httpx brackets IPv6 literals
        extensions = {"sni_hostname": target.raw_host.decode("ascii")} if target.scheme == "https" else {}
        # Connection: close makes every pinned connection single-use. httpcore
        # pools on (scheme, IP, port) and only applies sni_hostname at connect
        # time, so a reused TLS connection would skip this host's cert check.
        async with client.stream(
            "GET", pinned, headers={"Host": target.netloc.decode("ascii"), "Connection": "close"},
            extensions=extensions, follow_redirects=False,
        ) as resp:
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
            request = httpx.Request("GET", target, headers=resp.request.headers)
            return httpx.Response(resp.status_code, headers=headers, content=b"".join(chunks), request=request)
    raise UnsafeURLError("too many redirects")
