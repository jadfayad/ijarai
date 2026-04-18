"""
Rental provider interface.

Subclass RentalProvider and register the factory in __init__.py PROVIDERS to
add a new rental data source for another city.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from app.services.rentals.types import RentalListing, RentalSearchQuery


class RentalProvider(ABC):
    """Abstract base for a city's rental data source."""

    @abstractmethod
    async def search(self, query: RentalSearchQuery) -> list[RentalListing]:
        """Return rental listings near the query's hex. Return [] on failure."""
        ...
