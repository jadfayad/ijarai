import h3
import httpx
import pytest
from fastapi.testclient import TestClient

import app.api.rentals as rentals_api
import app.services.rentals.propertyfinder as pf
from app.main import app
from app.services.rentals import (
    ProviderPage,
    RentalListing,
    RentalProvider,
    RentalProviderUnavailable,
    RentalSearchQuery,
)

# A res-8 cell in Dubai Marina.
HEX = h3.latlng_to_cell(25.0805, 55.1403, 8)


def _listing(id_: str, hex_id: str, price=120_000.0, period="yearly") -> RentalListing:
    lat, lng = h3.cell_to_latlng(hex_id)
    return RentalListing(id=id_, title=id_, price=price, price_period=period, lat=lat, lng=lng)


class FakeProvider(RentalProvider):
    def __init__(self, by_hex=None, fail=False, has_more=False):
        self.by_hex = by_hex or {}
        self.fail = fail
        self.has_more = has_more
        self.calls: list[RentalSearchQuery] = []

    async def search(self, query):
        self.calls.append(query)
        if self.fail:
            raise RentalProviderUnavailable("down")
        return ProviderPage(
            listings=self.by_hex.get(query.hex_id, []),
            resolved_area="Dubai Marina",
            has_more=self.has_more,
        )


@pytest.fixture
def use_provider(monkeypatch):
    def install(provider):
        monkeypatch.setattr(rentals_api, "get_rental_provider", lambda _city: provider)
        return provider

    return install


def _search(**params):
    return TestClient(app).get("/api/rentals/search", params={"city": "dubai", "hex_id": HEX, **params})


def test_ok_reports_resolved_area_and_monthly_price(use_provider):
    use_provider(FakeProvider({HEX: [_listing("a", HEX), _listing("b", HEX, 9_000, "monthly")]}, has_more=True))
    body = _search().json()
    assert body["status"] == "ok"
    assert body["expanded"] is False
    assert body["resolved_area"] == "Dubai Marina"
    assert body["has_more"] is True
    assert [l["price_monthly"] for l in body["listings"]] == [10_000, 9_000]


def test_empty_is_distinct_from_unavailable(use_provider):
    use_provider(FakeProvider({}))
    assert _search().json()["status"] == "empty"

    use_provider(FakeProvider(fail=True))
    r = _search()
    assert r.status_code == 200
    assert r.json()["status"] == "unavailable"


def test_no_provider_is_a_status_not_an_error():
    r = TestClient(app).get(
        "/api/rentals/search",
        params={"city": "montreal", "hex_id": h3.latlng_to_cell(45.5, -73.57, 8)},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "no_provider"


def test_forced_expansion_searches_all_neighbours(use_provider):
    nbr = sorted(set(h3.grid_disk(HEX, 1)) - {HEX})[0]
    provider = use_provider(FakeProvider({nbr: [_listing("n", nbr)]}, has_more=True))
    body = _search(expand_neighbours="true").json()
    assert body["expanded"] is True
    assert body["has_more"] is False  # expanded results are a single page
    assert [l["id"] for l in body["listings"]] == ["n"]
    assert len(provider.calls) == 7  # the cell + 6 neighbours


def test_later_pages_skip_expansion(use_provider):
    nbr = sorted(set(h3.grid_disk(HEX, 1)) - {HEX})[0]
    provider = use_provider(FakeProvider({HEX: [_listing("x", nbr)]}, has_more=True))
    body = _search(page=2).json()
    assert body["page"] == 2 and body["expanded"] is False
    assert len(provider.calls) == 1 and provider.calls[0].page == 2


def test_propertyfinder_does_not_cache_failures(monkeypatch):
    monkeypatch.setenv("RAPIDAPI_KEY", "test-key")
    pf._search_cache.clear()
    pf._autocomplete_cache.clear()
    calls = {"n": 0}

    async def fake_get(self, url, params=None, headers=None):
        calls["n"] += 1
        request = httpx.Request("GET", url)
        if calls["n"] == 1:
            return httpx.Response(503, request=request, text="busy")
        if "autocomplete" in url:
            return httpx.Response(200, request=request, json={"data": [{"id": 50, "name": "Dubai Marina"}]})
        return httpx.Response(200, request=request, json={"success": True, "data": []})

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    provider = pf.PropertyFinderProvider()
    lat, lng = h3.cell_to_latlng(HEX)
    query = RentalSearchQuery(
        city_slug="dubai", hex_id=HEX, center_lat=lat, center_lng=lng,
        radius_m=500, bbox=(0, 0, 0, 0), area_name="Dubai Marina",
    )

    import asyncio

    with pytest.raises(RentalProviderUnavailable):
        asyncio.run(provider.search(query))
    page = asyncio.run(provider.search(query))  # retried, not served from cache
    assert page.listings == [] and page.resolved_area == "Dubai Marina"
