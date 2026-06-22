import httpx


class TripError(Exception):
    pass


class TripClient:
    def __init__(self, base_url: str, username: str, password: str, client: httpx.AsyncClient):
        self._base = base_url.rstrip("/")
        self._username = username
        self._password = password
        self._http = client
        self._access: str | None = None

    async def _login(self) -> None:
        resp = await self._http.post(
            f"{self._base}/api/auth/login",
            json={"username": self._username, "password": self._password},
        )
        if resp.status_code != 200:
            raise TripError(f"TRIP login failed: {resp.status_code}")
        self._access = resp.json().get("access_token")
        if not self._access:
            raise TripError("TRIP login returned no access_token")

    async def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        if self._access is None:
            await self._login()
        url = f"{self._base}{path}"
        headers = {"Authorization": f"Bearer {self._access}"}
        resp = await self._http.request(method, url, headers=headers, **kwargs)
        if resp.status_code == 401:
            await self._login()
            headers = {"Authorization": f"Bearer {self._access}"}
            resp = await self._http.request(method, url, headers=headers, **kwargs)
        if resp.status_code >= 400:
            raise TripError(f"TRIP {method} {path} -> {resp.status_code}")
        return resp
