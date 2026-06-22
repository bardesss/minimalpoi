import httpx
import pytest

from app.enrich.fetch import fetch_url


@pytest.mark.anyio
async def test_fetch_returns_text_and_final_url():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>hi</html>", headers={"content-type": "text/html"})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    result = await fetch_url("https://example.com/x", client=client)
    await client.aclose()
    assert result is not None
    assert result.status_code == 200
    assert "hi" in result.text
    assert result.content_type.startswith("text/html")
    assert result.final_url == "https://example.com/x"


@pytest.mark.anyio
async def test_fetch_returns_none_on_network_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("boom")

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    result = await fetch_url("https://example.com/x", client=client)
    await client.aclose()
    assert result is None


@pytest.fixture
def anyio_backend():
    return "asyncio"
