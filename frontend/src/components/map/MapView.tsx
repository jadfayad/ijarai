"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";
import Map, { Marker } from "react-map-gl/mapbox";
import { DeckGL } from "@deck.gl/react";
import { PolygonLayer } from "@deck.gl/layers";

luma.registerAdapters([webgl2Adapter]);
import { MapPin, Briefcase, Plane, Compass, Sparkles } from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CellPopup } from "./CellPopup";
import { GRID_RESOLUTION_CONFIG, type CommuteParams } from "@/lib/types";
import "mapbox-gl/dist/mapbox-gl.css";

const ICON_MAP: Record<string, typeof MapPin> = {
  briefcase: Briefcase,
  plane: Plane,
  "map-pin": MapPin,
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const DUBAI_VIEW = {
  longitude: 55.27,
  latitude: 25.2,
  zoom: 11,
  pitch: 0,
  bearing: 0,
};

const COLOR_RAMP: [number, number, number][] = [
  [215, 25, 28],
  [253, 174, 97],
  [255, 255, 191],
  [166, 217, 106],
  [26, 150, 65],
];

function scoreToColor(
  score: number,
  min: number,
  max: number
): [number, number, number, number] {
  const normalized = max > min ? (score - min) / (max - min) : 0.5;
  const t = Math.max(0, Math.min(1, normalized)) * (COLOR_RAMP.length - 1);
  const i = Math.min(Math.floor(t), COLOR_RAMP.length - 2);
  const f = t - i;
  const c0 = COLOR_RAMP[i];
  const c1 = COLOR_RAMP[i + 1];
  return [
    c0[0] + (c1[0] - c0[0]) * f,
    c0[1] + (c1[1] - c0[1]) * f,
    c0[2] + (c1[2] - c0[2]) * f,
    200,
  ];
}

function createSquarePolygon(
  center: [number, number],
  cellSizeMeters: number
): [number, number][] {
  const [lng, lat] = center;
  const latRad = (lat * Math.PI) / 180;
  const earthRadius = 6_378_137;
  const half = cellSizeMeters / 2;
  const offsets: [number, number][] = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
    [-half, -half],
  ];

  return offsets.map(([dx, dy]) => {
    const dLat = (dy / earthRadius) * (180 / Math.PI);
    const dLng = (dx / (earthRadius * Math.cos(latRad))) * (180 / Math.PI);
    return [lng + dLng, lat + dLat];
  });
}

export function MapView() {
  const {
    criteria,
    scoreData,
    setSelectedCellId,
    scoreThreshold,
    setScoreThreshold,
    gridResolution,
    loading,
    generate,
  } = useCriteriaStore();

  const hasActiveCriteria = criteria.some((c) => c.enabled);

  const destinations = useMemo(
    () =>
      criteria
        .filter((c) => c.enabled && c.type === "commute")
        .map((c) => {
          const params = c.params as CommuteParams;
          return {
            id: c.id,
            lat: params.destination.lat,
            lng: params.destination.lng,
            label: params.label || c.label,
            icon: c.icon,
          };
        })
        .filter((d) => d.lat !== 0 || d.lng !== 0),
    [criteria]
  );
  const [popupInfo, setPopupInfo] = useState<{
    x: number;
    y: number;
    properties: Record<string, unknown>;
  } | null>(null);

  const scoreRange = useMemo(() => {
    if (!scoreData?.features?.length) return { min: 0, max: 1 };
    let min = Infinity;
    let max = -Infinity;
    for (const f of scoreData.features) {
      const s = f.properties.score as number;
      if (s < min) min = s;
      if (s > max) max = s;
    }
    return { min, max };
  }, [scoreData]);

  useEffect(() => {
    setScoreThreshold(scoreRange.min);
  }, [scoreRange.min, setScoreThreshold]);

  const layers = useMemo(() => {
    if (!scoreData?.features?.length) return [];

    const data = scoreData.features
      .filter((f) => f.properties.score >= scoreThreshold)
      .map((f) => ({
        position: f.geometry.coordinates as [number, number],
        weight: f.properties.score as number,
        ...f.properties,
      }));

    if (!data.length) return [];

    const cellSize = GRID_RESOLUTION_CONFIG[gridResolution].cell_size_m;
    const dataWithPolygons = data.map((d) => ({
      ...d,
      polygon: createSquarePolygon(d.position, cellSize),
    }));

    return [
      new PolygonLayer({
        id: "score-cells",
        data: dataWithPolygons,
        getPolygon: (d: (typeof dataWithPolygons)[0]) => d.polygon,
        getFillColor: (d: (typeof dataWithPolygons)[0]) =>
          scoreToColor(d.weight, scoreRange.min, scoreRange.max),
        pickable: true,
        opacity: 0.85,
        stroked: false,
      }),
    ];
  }, [scoreData, scoreThreshold, scoreRange, gridResolution]);

  const visibleCount = useMemo(() => {
    if (!scoreData?.features?.length) return 0;
    return scoreData.features.filter(
      (f) => f.properties.score >= scoreThreshold
    ).length;
  }, [scoreData, scoreThreshold]);

  const totalCount = scoreData?.features?.length ?? 0;

  const handleClick = useCallback(
    (info: { object?: Record<string, unknown>; x?: number; y?: number }) => {
      if (info.object) {
        const cellId = info.object.cell_id as string;
        setSelectedCellId(cellId);
        setPopupInfo({
          x: info.x ?? 0,
          y: info.y ?? 0,
          properties: info.object,
        });
      } else {
        setSelectedCellId(null);
        setPopupInfo(null);
      }
    },
    [setSelectedCellId]
  );

  return (
    <div className="relative w-full h-full">
      <DeckGL
        initialViewState={DUBAI_VIEW}
        controller={true}
        layers={layers}
        onClick={handleClick}
        getTooltip={({ object }: { object?: Record<string, unknown> }) => {
          if (!object) return null;
          return `Score: ${((object.score as number) * 100).toFixed(0)}%`;
        }}
      >
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          reuseMaps
        >
          {destinations.map((d) => {
            const Icon = ICON_MAP[d.icon] ?? MapPin;
            return (
              <Marker
                key={d.id}
                longitude={d.lng}
                latitude={d.lat}
                anchor="bottom"
              >
                <div className="flex flex-col items-center group">
                  <div className="bg-primary text-primary-foreground rounded-full p-2 shadow-lg shadow-primary/30 ring-2 ring-white/20 transition-transform group-hover:scale-110">
                    <Icon size={16} />
                  </div>
                  {d.label && (
                    <span className="mt-1.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-medium text-white shadow-lg border border-white/[0.08] whitespace-nowrap max-w-[150px] truncate">
                      {d.label}
                    </span>
                  )}
                </div>
              </Marker>
            );
          })}
        </Map>
      </DeckGL>

      {popupInfo && (
        <CellPopup
          x={popupInfo.x}
          y={popupInfo.y}
          properties={popupInfo.properties}
          onClose={() => {
            setPopupInfo(null);
            setSelectedCellId(null);
          }}
        />
      )}

      {scoreData && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-black/50 backdrop-blur-2xl rounded-2xl px-6 py-4 shadow-2xl border border-white/[0.08] min-w-[320px] max-w-[420px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">
              Min score
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {Math.round(scoreThreshold * 100)}%
              <span className="text-muted-foreground font-normal text-xs ml-1.5">
                ({visibleCount}/{totalCount})
              </span>
            </span>
          </div>
          <Slider
            value={[scoreThreshold]}
            onValueChange={(val) => {
              const v = Array.isArray(val) ? val[0] : val;
              setScoreThreshold(v);
            }}
            min={scoreRange.min}
            max={scoreRange.max}
            step={0.01}
          />
        </div>
      )}

      {!scoreData && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 backdrop-blur-2xl border border-white/[0.1] rounded-3xl px-10 py-8 text-center max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-500">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Compass className="text-primary" size={26} />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              Welcome to OptimHouse
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5">
              Configure your preferences in the sidebar, then generate your
              personalized heatmap to find the ideal location in Dubai.
            </p>
            <Button
              className="pointer-events-auto h-11 px-8 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 border-0"
              size="lg"
              onClick={generate}
              disabled={loading || !hasActiveCriteria}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Computing...
                </span>
              ) : !hasActiveCriteria ? (
                <span className="flex items-center gap-2">
                  <Sparkles size={16} />
                  Enable a criterion to continue
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles size={16} />
                  Generate Heatmap
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
