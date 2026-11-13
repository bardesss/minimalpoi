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


@pytest.mark.anyio
async def test_large_html_truncated_but_head_parsed():
    from app.enrich.fetch import MAX_HTML_BYTES
    from app.enrich.parse import parse_document

    head = '<html><head><meta property="og:title" content="Big Place"></head><body>'
    html = head + "x" * (5 * 1024 * 1024)
    client = httpx.AsyncClient(transport=httpx.MockTransport(
        lambda r: httpx.Response(200, text=html, headers={"content-type": "text/html; charset=utf-8"})))
    result = await fetch_url("https://example.com/big", client=client)
    await client.aclose()
    assert result is not None
    assert len(result.text) == MAX_HTML_BYTES
    assert parse_document(result.text).og["title"] == "Big Place"


@pytest.mark.anyio
async def test_non_html_content_type_returns_none():
    client = httpx.AsyncClient(transport=httpx.MockTransport(
        lambda r: httpx.Response(200, content=b"%PDF-1.4", headers={"content-type": "application/pdf"})))
    assert await fetch_url("https://example.com/x.pdf", client=client) is None
    await client.aclose()
