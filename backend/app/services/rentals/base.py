"""
Rental provider interface.

Subclass RentalProvider and register the factory in __init__.py PROVIDERS to
add a new rental data source for another city.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from app.services.rentals.types import ProviderPage, RentalSearchQuery


class RentalProvider(ABC):
    """Abstract base for a city's rental data source."""

    @abstractmethod
    async def search(self, query: RentalSearchQuery) -> ProviderPage:
        """Return one page of listings near the query's hex.

        An empty page means "searched, nothing matched". Raise
        RentalProviderUnavailable for transient failures instead of returning
        an empty page, so they aren't cached or shown as "no listings".
        """
        ...
