from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field


class LatLng(BaseModel):
    lat: float
    lng: float


# ── Typed params per criterion type ──────────────────────────────────────


class CommuteParams(BaseModel):
    destination: LatLng = Field(default_factory=lambda: LatLng(lat=0, lng=0))
    mode: Literal["car", "transit"] = "car"
    source: Literal["isochrone", "google"] = "isochrone"
    time_of_day: Literal["peak", "off_peak"] = "peak"
    label: str = ""


class AmenityParams(BaseModel):
    categories: list[str] = Field(default_factory=list)


class TransitParams(BaseModel):
    modes: list[Literal["train", "bus"]] = Field(
        default_factory=lambda: ["train", "bus"]
    )


class HealthcareParams(BaseModel):
    facility_types: list[Literal["hospital", "clinic", "pharmacy"]] = Field(
        default_factory=lambda: ["hospital", "clinic"]
    )


class SchoolQualityParams(BaseModel):
    age_band: Literal["primary", "secondary", "all"] = "all"


class HazardParams(BaseModel):
    hazards: list[Literal["flood", "wildfire"]] = Field(
        default_factory=lambda: ["flood"]
    )


class BudgetParams(BaseModel):
    max_monthly_rent: float = 8000
    include_utilities: bool = False


class ApartmentParams(BaseModel):
    min_surface_m2: float | None = None
    max_surface_m2: float | None = None
    min_bedrooms: int | None = None
    max_bedrooms: int | None = None
    furnished: Literal["furnished", "unfurnished", "partly", "any"] = "any"
    parking: bool | None = None
    outdoor_space: bool | None = None


class AiCriterionParams(BaseModel):
    prompt: str = ""
    strategy: str = "zone"
    metric_label: str = "AI Score"
    zones: list[dict] = Field(default_factory=list)
    pois: list[dict] = Field(default_factory=list)
    poi_scoring_mode: Literal["proximity", "density"] = "density"
    poi_search_radius_m: float = 1000.0
    higher_is_better: bool = True


class EmptyParams(BaseModel):
    """Params placeholder for criteria that take no configuration."""
    pass


# ── Discriminated criterion union ────────────────────────────────────────


class _CriterionBase(BaseModel):
    weight: float = Field(ge=0, le=10)


class CommuteCriterion(_CriterionBase):
    type: Literal["commute"] = "commute"
    params: CommuteParams = Field(default_factory=CommuteParams)


class AmenitiesCriterion(_CriterionBase):
    type: Literal["amenities"] = "amenities"
    params: AmenityParams = Field(default_factory=AmenityParams)


class BudgetCriterion(_CriterionBase):
    type: Literal["budget"] = "budget"
    params: BudgetParams = Field(default_factory=BudgetParams)


class NeighborhoodCriterion(_CriterionBase):
    type: Literal["neighborhood"] = "neighborhood"
    params: EmptyParams = Field(default_factory=EmptyParams)


class SafetyCriterion(_CriterionBase):
    type: Literal["safety"] = "safety"
    params: EmptyParams = Field(default_factory=EmptyParams)


class WalkabilityCriterion(_CriterionBase):
    type: Literal["walkability"] = "walkability"
    params: EmptyParams = Field(default_factory=EmptyParams)


class GreenSpacesCriterion(_CriterionBase):
    type: Literal["green_spaces"] = "green_spaces"
    params: EmptyParams = Field(default_factory=EmptyParams)


class CommunityCriterion(_CriterionBase):
    type: Literal["community"] = "community"
    params: EmptyParams = Field(default_factory=EmptyParams)


class InfrastructureCriterion(_CriterionBase):
    type: Literal["infrastructure"] = "infrastructure"
    params: EmptyParams = Field(default_factory=EmptyParams)


class AestheticsCriterion(_CriterionBase):
    type: Literal["aesthetics"] = "aesthetics"
    params: EmptyParams = Field(default_factory=EmptyParams)


class DesirabilityCriterion(_CriterionBase):
    type: Literal["desirability"] = "desirability"
    params: EmptyParams = Field(default_factory=EmptyParams)


class NoiseCriterion(_CriterionBase):
    type: Literal["noise"] = "noise"
    params: EmptyParams = Field(default_factory=EmptyParams)


class TransitCriterion(_CriterionBase):
    type: Literal["transit"] = "transit"
    params: TransitParams = Field(default_factory=TransitParams)


class HealthcareCriterion(_CriterionBase):
    type: Literal["healthcare"] = "healthcare"
    params: HealthcareParams = Field(default_factory=HealthcareParams)


class SchoolQualityCriterion(_CriterionBase):
    type: Literal["schools"] = "schools"
    params: SchoolQualityParams = Field(default_factory=SchoolQualityParams)


class HazardCriterion(_CriterionBase):
    type: Literal["hazard"] = "hazard"
    params: HazardParams = Field(default_factory=HazardParams)


class AiCriterion(_CriterionBase):
    type: Literal["ai"] = "ai"
    params: AiCriterionParams = Field(default_factory=AiCriterionParams)


class ApartmentCriterion(_CriterionBase):
    type: Literal["apartment"] = "apartment"
    params: ApartmentParams = Field(default_factory=ApartmentParams)


CriterionRequest = Annotated[
    Union[
        CommuteCriterion,
        AmenitiesCriterion,
        BudgetCriterion,
        NeighborhoodCriterion,
        SafetyCriterion,
        WalkabilityCriterion,
        GreenSpacesCriterion,
        CommunityCriterion,
        InfrastructureCriterion,
        AestheticsCriterion,
        DesirabilityCriterion,
        NoiseCriterion,
        TransitCriterion,
        HealthcareCriterion,
        SchoolQualityCriterion,
        HazardCriterion,
        AiCriterion,
        ApartmentCriterion,
    ],
    Field(discriminator="type"),
]


class ScoreRequest(BaseModel):
    criteria: list[CriterionRequest]
    cell_size_m: int = Field(default=1000, ge=200, le=2500)
    city: str = "dubai"


class ScoreResponse(BaseModel):
    type: str = "FeatureCollection"
    features: list[dict]
    criterion_labels: dict[str, str] = Field(default_factory=dict)


class GeocodeRequest(BaseModel):
    address: str
    city: str = "dubai"


class GeocodeResponse(BaseModel):
    lat: float
    lng: float
    display_name: str


class DestinationConfig(BaseModel):
    label: str
    lat: float
    lng: float
    icon: str


class CityConfigResponse(BaseModel):
    slug: str
    name: str
    country_code: str
    bounds: dict[str, float]
    center_lat: float
    center_lng: float
    timezone_offset_hours: int
    default_zoom: int
    currency_code: str
    currency_symbol: str
    rent_min: int
    rent_max: int
    rent_step: int
    rent_default: int
    default_destinations: list[DestinationConfig]
    utility_avg_monthly: float = 0
    rental_provider: str | None = None
