export interface LatLng {
  lat: number;
  lng: number;
}

export type TransportMode = "car" | "transit";

export type CriterionType =
  | "commute"
  | "amenities"
  | "budget"
  | "neighborhood"
  | "noise";

export interface CommuteParams {
  destination: LatLng;
  mode: TransportMode;
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
