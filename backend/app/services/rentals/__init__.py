"""
Rental listing providers — one per city, plugged via city.rental_provider.

Mirrors the ai_agent provider pattern: subclass RentalProvider, register its
factory in PROVIDERS. The factory is cached per-provider (singletons).
"""
from __future__ import annotations

import functools
from collections.abc import Callable

from app.city_config import CityConfig
from app.services.rentals.base import RentalProvider
from app.services.rentals.types import (
    RentalListing,
    RentalSearchQuery,
    RentalSearchResponse,
)


def _get_propertyfinder_provider() -> RentalProvider:
    from app.services.rentals.propertyfinder import PropertyFinderProvider
    return PropertyFinderProvider()


PROVIDERS: dict[str, Callable[[], RentalProvider]] = {
    "propertyfinder": _get_propertyfinder_provider,
}


@functools.lru_cache(maxsize=4)
def _build_provider(name: str) -> RentalProvider:
    factory = PROVIDERS.get(name)
    if factory is None:
        raise ValueError(
            f"Unknown rental provider '{name}'. "
            f"Available: {', '.join(PROVIDERS.keys())}"
        )
    return factory()


def get_rental_provider(city: CityConfig) -> RentalProvider | None:
    """Return the rental provider for a city, or None if none configured."""
    if city.rental_provider is None:
        return None
    return _build_provider(city.rental_provider)


__all__ = [
    "RentalProvider",
    "RentalListing",
    "RentalSearchQuery",
    "RentalSearchResponse",
    "get_rental_provider",
]
