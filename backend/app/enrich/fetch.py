import httpx
from sqlmodel import SQLModel

from .safety import UnsafeURLError, safe_get

USER_AGENT = "MinimalPOI/0.1 (+https://github.com/Bardesss/minimalpoi)"
TIMEOUT_SECONDS = 10.0


class FetchResult(SQLModel):
    final_url: str
    status_code: int
    content_type: str
    text: str


async def fetch_url(url: str, client: httpx.AsyncClient | None = None) -> FetchResult | None:
    owns_client = client is None
    if client is None:
        client = httpx.AsyncClient(
            follow_redirects=False,
            timeout=TIMEOUT_SECONDS,
            headers={"User-Agent": USER_AGENT},
        )
    try:
        resp = await safe_get(client, url)
    except (httpx.HTTPError, UnsafeURLError):
        return None
    finally:
        if owns_client:
            await client.aclose()
    return FetchResult(
        final_url=str(resp.url),
        status_code=resp.status_code,
        content_type=resp.headers.get("content-type", ""),
        text=resp.text,
    )
