import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import httpx

ALLOWED_SCHEMES = {"http", "https"}
MAX_REDIRECTS = 5


class UnsafeURLError(Exception):
    pass


def _resolve_ips(host: str) -> list[str]:
    infos = socket.getaddrinfo(host, None)
    return [info[4][0] for info in infos]


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


async def safe_get(client: httpx.AsyncClient, url: str) -> httpx.Response:
    current = url
    for _ in range(MAX_REDIRECTS + 1):
        assert_safe_url(current)
        resp = await client.get(current)
        if resp.is_redirect and "location" in resp.headers:
            current = urljoin(current, resp.headers["location"])
            continue
        return resp
    raise UnsafeURLError("too many redirects")
