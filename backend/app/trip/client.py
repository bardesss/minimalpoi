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

    async def list_places(self) -> list[dict]:
        return (await self._request("GET", "/api/places")).json()

    async def create_place(self, payload: dict) -> dict:
        return (await self._request("POST", "/api/places", json=payload)).json()

    async def update_place(self, place_id: int, payload: dict) -> dict:
        return (await self._request("PUT", f"/api/places/{place_id}", json=payload)).json()

    async def delete_place(self, place_id: int) -> None:
        await self._request("DELETE", f"/api/places/{place_id}")

    async def list_categories(self) -> list[dict]:
        return (await self._request("GET", "/api/categories")).json()

    async def create_category(self, payload: dict) -> dict:
        return (await self._request("POST", "/api/categories", json=payload)).json()

    async def update_category(self, category_id: int, payload: dict) -> dict:
        return (await self._request("PUT", f"/api/categories/{category_id}", json=payload)).json()

    async def delete_category(self, category_id: int) -> None:
        await self._request("DELETE", f"/api/categories/{category_id}")
