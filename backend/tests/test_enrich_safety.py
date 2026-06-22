import httpx
import pytest
from app.enrich import safety
from app.enrich.safety import UnsafeURLError, assert_safe_url, safe_get


@pytest.fixture
def anyio_backend():
    return "asyncio"


def test_rejects_non_http_scheme():
    with pytest.raises(UnsafeURLError):
        assert_safe_url("file:///etc/passwd")

def test_rejects_metadata_ip(monkeypatch):
    monkeypatch.setattr(safety, "_resolve_ips", lambda host: ["169.254.169.254"])
    with pytest.raises(UnsafeURLError):
        assert_safe_url("http://metadata.internal/latest")

def test_rejects_loopback_and_private(monkeypatch):
    for ip in ("127.0.0.1", "10.0.0.5", "192.168.1.1", "::1"):
        monkeypatch.setattr(safety, "_resolve_ips", lambda host, ip=ip: [ip])
        with pytest.raises(UnsafeURLError):
            assert_safe_url("http://internal.example/")

def test_allows_public(monkeypatch):
    monkeypatch.setattr(safety, "_resolve_ips", lambda host: ["93.184.216.34"])
    assert assert_safe_url("https://example.com/page") is None

@pytest.mark.anyio
async def test_safe_get_revalidates_redirect_to_metadata(monkeypatch):
    def resolve(host):
        return ["169.254.169.254"] if "metadata" in host else ["93.184.216.34"]
    monkeypatch.setattr(safety, "_resolve_ips", resolve)
    def handler(request):
        return httpx.Response(307, headers={"location": "http://metadata.internal/latest"})
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler), follow_redirects=False)
    with pytest.raises(UnsafeURLError):
        await safe_get(client, "https://good.example/")
    await client.aclose()
