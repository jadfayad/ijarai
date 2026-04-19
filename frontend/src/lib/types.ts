export interface LatLng {
  lat: number;
  lng: number;
}

export type TransportMode = "car" | "transit";

export type CommuteSource = "isochrone" | "google";

export type TimeOfDay = "peak" | "off_peak";

export type GridResolution = "coarse" | "normal" | "fine" | "max";

// Keep in sync with backend/app/grid_config.py RESOLUTIONS
export const GRID_RESOLUTION_CONFIG: Record<
  GridResolution,
  { cell_size_m: number; label: string; description: string }
> = {
  coarse: { cell_size_m: 2000, label: "Coarse", description: "~190 cells — fastest" },
  normal: { cell_size_m: 1000, label: "Normal", description: "~1,300 cells — fast" },
  fine: { cell_size_m: 500, label: "Fine", description: "~9,100 cells — balanced" },
  max: { cell_size_m: 250, label: "Max", description: "~63,700 cells — detailed" },
};

export type CriterionType =
  | "commute"
  | "amenities"
  | "budget"
  | "neighborhood"
  | "safety"
  | "walkability"
  | "green_spaces"
  | "community"
  | "infrastructure"
  | "aesthetics"
  | "desirability"
  | "noise"
  | "transit"
  | "healthcare"
  | "schools"
  | "hazard"
  | "ai"
  | "apartment";

export type TransitMode = "train" | "bus";

export type HealthcareFacilityType = "hospital" | "clinic" | "pharmacy";

export type SchoolAgeBand = "primary" | "secondary" | "all";

export type HazardType = "flood" | "wildfire";

export type CommutePreset =
  | "office"
  | "airport"
  | "partner"
  | "family"
  | "school"
  | "gym"
  | "other";

export interface CommutePresetConfig {
  preset: CommutePreset;
  label: string;
  icon: string;
  description: string;
}

export const COMMUTE_PRESETS: CommutePresetConfig[] = [
  { preset: "office", label: "Office", icon: "briefcase", description: "Daily commute to your workplace" },
  { preset: "airport", label: "Airport", icon: "plane", description: "Travel time to the airport" },
  { preset: "partner", label: "Partner", icon: "heart", description: "Commute to your partner's place" },
  { preset: "family", label: "Family", icon: "users", description: "Visit family easily" },
  { preset: "school", label: "School", icon: "graduation-cap", description: "School or university commute" },
  { preset: "gym", label: "Gym", icon: "dumbbell", description: "Get to the gym quickly" },
  { preset: "other", label: "Other", icon: "map-pin", description: "Any other frequent destination" },
];

export interface CommuteParams {
  destination: LatLng;
  mode: TransportMode;
  source: CommuteSource;
  time_of_day: TimeOfDay;
  label?: string;
}

export interface AmenityParams {
  categories: string[];
}

export interface BudgetParams {
  max_monthly_rent: number;
  include_utilities?: boolean;
}

export interface TransitParams {
  modes: TransitMode[];
}

export interface HealthcareParams {
  facility_types: HealthcareFacilityType[];
}

export interface SchoolQualityParams {
  age_band: SchoolAgeBand;
}

export interface HazardParams {
  hazards: HazardType[];
}

export type FurnishedPreference = "furnished" | "unfurnished" | "partly" | "any";

export interface ApartmentParams {
  min_surface_m2?: number | null;
  max_surface_m2?: number | null;
  min_bedrooms?: number | null;
  max_bedrooms?: number | null;
  furnished: FurnishedPreference;
  parking?: boolean | null;
  outdoor_space?: boolean | null;
}

export interface AiZoneScore {
  name: string;
  center: [number, number];
  radius_km: number;
  score: number;
  metric_value: number;
  metric_label: string;
}

export interface AiPoiResult {
  lat: number;
  lng: number;
  weight: number;
  label: string;
}

export interface AiParams {
  prompt: string;
  strategy: string;
  metric_label: string;
  zones: AiZoneScore[];
  pois: AiPoiResult[];
  poi_scoring_mode: "proximity" | "density";
  poi_search_radius_m: number;
  higher_is_better?: boolean;
}

export interface AgentResearchRequest {
  prompt: string;
  city: string;
  existing_criteria?: CriterionConfig[];
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface AgentResearchResponse {
  strategy: string;
  summary: string;
  label: string;
  metric_label: string;
  zones: AiZoneScore[];
  pois: AiPoiResult[];
  poi_scoring_mode: string;
  poi_search_radius_m: number;
  usage?: TokenUsage;
}

export interface AgentTodo {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
}

export interface EmittedCriterionEvent {
  criterion: CriterionConfig;
  reasoning: string;
  source_tool: "typed" | "ai";
  /** Machine-readable hint when the agent emitted with enabled=false due to a
   *  missing user input (e.g. "destination", "rent_amount"). */
  missing_input: string;
}

export interface CriterionUpdatedEvent {
  criterion_id: string;
  updates: {
    weight?: number;
    enabled?: boolean;
    label?: string;
    params?: Record<string, unknown>;
  };
  reasoning: string;
}

export interface CriterionDeletedEvent {
  criterion_id: string;
  reasoning: string;
}

export type AgentStreamEvent =
  | { type: "plan"; data: { todos: AgentTodo[] } }
  | { type: "step"; data: { tool: string; status: string } }
  | { type: "criterion"; data: EmittedCriterionEvent }
  | { type: "criterion_updated"; data: CriterionUpdatedEvent }
  | { type: "criterion_deleted"; data: CriterionDeletedEvent }
  | { type: "result"; data: AgentResearchResponse }
  | { type: "error"; data: { message: string } };

export type CriterionOrigin = "manual" | "agent" | "wizard";

export interface CriterionConfig {
  id: string;
  type: CriterionType;
  label: string;
  description: string;
  weight: number;
  enabled: boolean;
  params:
    | CommuteParams
    | AmenityParams
    | BudgetParams
    | TransitParams
    | HealthcareParams
    | SchoolQualityParams
    | HazardParams
    | AiParams
    | ApartmentParams
    | Record<string, never>;
  icon: string;
  origin?: CriterionOrigin;
}

export interface ScoreRequest {
  criteria: {
    type: string;
    weight: number;
    params: Record<string, unknown>;
  }[];
  cell_size_m: number;
}

export interface GeoJSONFeature {
  type: "Feature";
  properties: {
    cell_id: string;
    score: number;
    [key: string]: unknown;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface ScoreResponse {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
  /** Maps criterion keys (e.g. "commute_car_peak_0") to display labels */
  criterion_labels?: Record<string, string>;
}

export interface Scenario {
  id: string;
  name: string;
  city: string;
  createdAt: number;
  criteria: CriterionConfig[];
  gridResolution: GridResolution;
  scoreThreshold: number;
  scoreData: ScoreResponse | null;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

export interface DestinationConfig {
  label: string;
  lat: number;
  lng: number;
  icon: string;
}

export interface CityConfig {
  slug: string;
  name: string;
  country_code: string;
  bounds: { min_lat: number; max_lat: number; min_lng: number; max_lng: number };
  center_lat: number;
  center_lng: number;
  timezone_offset_hours: number;
  default_zoom: number;
  currency_code: string;
  currency_symbol: string;
  rent_min: number;
  rent_max: number;
  rent_step: number;
  rent_default: number;
  default_destinations: DestinationConfig[];
  utility_avg_monthly?: number;
  rental_provider?: string | null;
}

export interface RentalListing {
  id: string;
  title: string;
  price: number;
  currency: string;
  price_period: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  size_sqft?: number | null;
  lat: number;
  lng: number;
  thumbnail_url?: string | null;
  external_url?: string | null;
  property_type?: string | null;
  source: string;
}

export interface RentalSearchResponse {
  hex_id: string;
  count: number;
  listings: RentalListing[];
}
