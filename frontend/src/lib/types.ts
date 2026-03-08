export interface LatLng {
  lat: number;
  lng: number;
}

export type TransportMode = "car" | "transit";

export type TimeOfDay = "peak" | "off_peak";

export type GridResolution = "coarse" | "normal" | "fine";

// Keep in sync with backend/app/grid_config.py RESOLUTIONS
export const GRID_RESOLUTION_CONFIG: Record<
  GridResolution,
  { cell_size_m: number; label: string; description: string; circleRadius: number }
> = {
  coarse: { cell_size_m: 1000, label: "Coarse", description: "~1,300 cells — fast", circleRadius: 550 },
  normal: { cell_size_m: 500, label: "Normal", description: "~5,400 cells — balanced", circleRadius: 300 },
  fine: { cell_size_m: 250, label: "Fine", description: "~21,000 cells — detailed", circleRadius: 150 },
};

export type CriterionType =
  | "commute"
  | "amenities"
  | "budget"
  | "neighborhood"
  | "noise";

export interface CommuteParams {
  destination: LatLng;
  mode: TransportMode;
  time_of_day: TimeOfDay;
  label?: string;
}

export interface AmenityParams {
  categories: string[];
}

export interface BudgetParams {
  max_monthly_rent: number;
}

export interface CriterionConfig {
  id: string;
  type: CriterionType;
  label: string;
  description: string;
  weight: number;
  enabled: boolean;
  params: CommuteParams | AmenityParams | BudgetParams | Record<string, never>;
  icon: string;
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
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}
