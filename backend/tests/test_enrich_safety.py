import httpx
import pytest
from app.enrich import safety
from app.enrich.safety import UnsafeURLError, assert_safe_url, safe_get

# Captured at import, before conftest's autouse fixture stubs it out.
_real_resolve_ips = safety._resolve_ips


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_rejects_non_http_scheme():
    with pytest.raises(UnsafeURLError):
        await assert_safe_url("file:///etc/passwd")

@pytest.mark.anyio
async def test_rejects_metadata_ip(monkeypatch):
    monkeypatch.setattr(safety, "_resolve_ips", _async_resolver(["169.254.169.254"]))
    with pytest.raises(UnsafeURLError):
        await assert_safe_url("http://metadata.internal/latest")

@pytest.mark.anyio
async def test_rejects_loopback_and_private(monkeypatch):
    for ip in ("127.0.0.1", "10.0.0.5", "192.168.1.1", "::1"):
        monkeypatch.setattr(safety, "_resolve_ips", _async_resolver([ip]))
        with pytest.raises(UnsafeURLError):
            await assert_safe_url("http://internal.example/")

@pytest.mark.anyio
async def test_allows_public(monkeypatch):
    monkeypatch.setattr(safety, "_resolve_ips", _async_resolver(["93.184.216.34"]))
    assert await assert_safe_url("https://example.com/page") == ["93.184.216.34"]

@pytest.mark.anyio
async def test_safe_get_revalidates_redirect_to_metadata(monkeypatch):
    async def resolve(host):
        return ["169.254.169.254"] if "metadata" in host else ["93.184.216.34"]
    monkeypatch.setattr(safety, "_resolve_ips", resolve)
    def handler(request):
        return httpx.Response(307, headers={"location": "http://metadata.internal/latest"})
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler), follow_redirects=False)
    with pytest.raises(UnsafeURLError):
        await safe_get(client, "https://good.example/")
    await client.aclose()


def _async_resolver(*answers):
    """Async `_resolve_ips` stub; returns answers in order (last one repeats)."""
    calls: list[str] = []

    async def resolve(host):
        calls.append(host)
        return answers[min(len(calls) - 1, len(answers) - 1)]
    resolve.calls = calls
    return resolve


@pytest.mark.anyio
async def test_connects_to_validated_ip_not_re_resolved(monkeypatch):
    # DNS rebinding: first answer is public, any later answer is loopback. The
    # request must go to the validated public IP with the original Host header.
    resolve = _async_resolver(["93.184.216.34"], ["127.0.0.1"])
    monkeypatch.setattr(safety, "_resolve_ips", resolve)
    seen: list[httpx.Request] = []

    def handler(request):
        seen.append(request)
        return httpx.Response(200, text="ok")
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    resp = await safe_get(client, "https://rebind.example:8443/p?q=1")
    await client.aclose()
    assert len(resolve.calls) == 1
    req = seen[0]
    assert req.url.host == "93.184.216.34"
    assert req.url.port == 8443
    assert req.url.raw_path == b"/p?q=1"
    assert req.headers["host"] == "rebind.example:8443"
    assert req.extensions["sni_hostname"] == "rebind.example"
    # Callers (fetch.final_url, gmaps.resolve_shortlink) see the original URL.
    assert str(resp.url) == "https://rebind.example:8443/p?q=1"


@pytest.mark.anyio
async def test_ipv6_pin_is_bracketed_and_http_has_no_sni(monkeypatch):
    monkeypatch.setattr(safety, "_resolve_ips", _async_resolver(["2606:2800:220:1:248:1893:25c8:1946"]))
    seen: list[httpx.Request] = []

    def handler(request):
        seen.append(request)
        return httpx.Response(200, text="ok")
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    await safe_get(client, "http://v6.example/x")
    await client.aclose()
    assert str(seen[0].url) == "http://[2606:2800:220:1:248:1893:25c8:1946]/x"
    assert seen[0].headers["host"] == "v6.example"
    assert "sni_hostname" not in seen[0].extensions


@pytest.mark.anyio
async def test_overall_deadline(monkeypatch):
    import asyncio
    import time

    monkeypatch.setattr(safety, "FETCH_DEADLINE_S", 0.3)

    class Drip(httpx.AsyncByteStream):
        async def __aiter__(self):
            for _ in range(30):  # 30 s in total, one byte per second
                await asyncio.sleep(1)
                yield b"x"

    def handler(request):
        return httpx.Response(200, stream=Drip())
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    start = time.monotonic()
    with pytest.raises(UnsafeURLError):
        await safe_get(client, "https://slow.example/")
    await client.aclose()
    assert time.monotonic() - start < 2


def test_fetch_deadline_value():
    assert safety.FETCH_DEADLINE_S == 20


@pytest.mark.parametrize("ip", ["64:ff9b::7f00:1", "64:ff9b::a9fe:a9fe", "64:ff9b:1::1", "::ffff:127.0.0.1"])
def test_nat64_rejected(ip):
    assert safety._is_public(ip) is False


def test_is_public_allows_global():
    assert safety._is_public("93.184.216.34") is True
    assert safety._is_public("2606:2800:220:1:248:1893:25c8:1946") is True


@pytest.mark.anyio
async def test_resolver_is_awaited(monkeypatch):
    import inspect
    assert inspect.iscoroutinefunction(_real_resolve_ips)
    # The real resolver goes through the loop's non-blocking getaddrinfo.
    import asyncio
    loop = asyncio.get_running_loop()

    async def fake_getaddrinfo(host, port, *a, **kw):
        assert host == "example.test"
        return [(0, 0, 0, "", ("93.184.216.34", 0)), (0, 0, 0, "", ("2606:2800::1", 0, 0, 0))]
    monkeypatch.setattr(loop, "getaddrinfo", fake_getaddrinfo)
    assert await _real_resolve_ips("example.test") == ["93.184.216.34", "2606:2800::1"]


@pytest.mark.anyio
async def test_allow_private_only_relaxes_public_check(monkeypatch):
    monkeypatch.setattr(safety, "_resolve_ips", _async_resolver(["10.0.0.5"]))
    client = httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(200, text="ok")))
    with pytest.raises(UnsafeURLError):
        await safe_get(client, "http://nominatim.lan/")
    resp = await safe_get(client, "http://nominatim.lan/", allow_private=True)
    assert resp.text == "ok"
    # Scheme check still applies.
    with pytest.raises(UnsafeURLError):
        await safe_get(client, "file:///etc/passwd", allow_private=True)
    await client.aclose()


@pytest.mark.anyio
async def test_allow_private_does_not_extend_to_redirect_targets(monkeypatch):
    async def resolve(host):
        return ["10.0.0.5"] if host == "nominatim.lan" else ["10.0.0.1"]
    monkeypatch.setattr(safety, "_resolve_ips", resolve)

    def handler(request):
        if request.headers["host"] == "nominatim.lan":
            return httpx.Response(302, headers={"location": "http://router.lan/admin"})
        return httpx.Response(200, text="router")
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with pytest.raises(UnsafeURLError):
        await safe_get(client, "http://nominatim.lan/search", allow_private=True)
    await client.aclose()
