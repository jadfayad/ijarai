"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";
import Map, { Marker } from "react-map-gl/mapbox";
import { DeckGL } from "@deck.gl/react";
import { PolygonLayer } from "@deck.gl/layers";

luma.registerAdapters([webgl2Adapter]);
import { MapPin, Briefcase, Plane } from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
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
  const { criteria, scoreData, setSelectedCellId, selectedCellId, scoreThreshold, setScoreThreshold, gridResolution } =
    useCriteriaStore();

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
    return scoreData.features.filter((f) => f.properties.score >= scoreThreshold).length;
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
              <Marker key={d.id} longitude={d.lng} latitude={d.lat} anchor="bottom">
                <div className="flex flex-col items-center group">
                  <div className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg ring-2 ring-white/30 transition-transform group-hover:scale-110">
                    <Icon size={16} />
                  </div>
                  {d.label && (
                    <span className="mt-1 px-1.5 py-0.5 rounded bg-background/90 text-[10px] font-medium text-foreground shadow-sm border border-border whitespace-nowrap max-w-[150px] truncate">
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
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-background/85 backdrop-blur-md rounded-xl px-5 py-3 shadow-lg border border-border min-w-[300px] max-w-[400px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Min score
            </span>
            <span className="text-xs font-semibold tabular-nums">
              {Math.round(scoreThreshold * 100)}%
              <span className="text-muted-foreground font-normal ml-1.5">
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
          <div className="bg-background/80 backdrop-blur-sm rounded-xl px-8 py-6 text-center max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Welcome to OptimHouse</h3>
            <p className="text-muted-foreground text-sm">
              Configure your preferences in the sidebar and click
              &ldquo;Generate Heatmap&rdquo; to find your ideal location in Dubai.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
