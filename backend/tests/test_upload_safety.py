"""Upload / SSRF / body-size safety (audit batch 4)."""
import httpx
import pytest

from app.enrich.safety import ResponseTooLargeError, safe_get


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_safe_get_caps_oversized_body(monkeypatch):
    from app.enrich import safety

    monkeypatch.setattr(safety, "_resolve_ips", lambda host: ["93.184.216.34"])

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"x" * 5000)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with pytest.raises(ResponseTooLargeError):
        await safe_get(client, "https://example.com/big", max_bytes=1000)
    await client.aclose()


@pytest.mark.anyio
async def test_safe_get_returns_small_body(monkeypatch):
    from app.enrich import safety

    monkeypatch.setattr(safety, "_resolve_ips", lambda host: ["93.184.216.34"])

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="hello", headers={"content-type": "text/plain"})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    resp = await safe_get(client, "https://example.com/ok", max_bytes=1000)
    assert resp.status_code == 200
    assert resp.text == "hello"
    await client.aclose()
