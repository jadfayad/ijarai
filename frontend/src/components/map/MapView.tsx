"use client";

import { useCallback, useMemo, useState } from "react";
import Map, { NavigationControl } from "react-map-gl/mapbox";
import { DeckGL } from "@deck.gl/react";
import { ScatterplotLayer } from "@deck.gl/layers";
import { useCriteriaStore } from "@/stores/criteria-store";
import { Slider } from "@/components/ui/slider";
import { CellPopup } from "./CellPopup";
import "mapbox-gl/dist/mapbox-gl.css";

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

function scoreToColor(score: number): [number, number, number, number] {
  const t = Math.max(0, Math.min(1, score)) * (COLOR_RAMP.length - 1);
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

export function MapView() {
  const { scoreData, setSelectedCellId, selectedCellId, scoreThreshold, setScoreThreshold } =
    useCriteriaStore();
  const [popupInfo, setPopupInfo] = useState<{
    x: number;
    y: number;
    properties: Record<string, unknown>;
  } | null>(null);

  const layers = useMemo(() => {
    if (!scoreData?.features?.length) return [];

    const data = scoreData.features
      .filter((f) => f.properties.score >= scoreThreshold)
      .map((f) => ({
        position: f.geometry.coordinates as [number, number],
        weight: f.properties.score as number,
        ...f.properties,
      }));

    return [
      new ScatterplotLayer({
        id: "score-cells",
        data,
        getPosition: (d: (typeof data)[0]) => d.position,
        getFillColor: (d: (typeof data)[0]) => scoreToColor(d.weight),
        getRadius: 300,
        pickable: true,
        radiusMinPixels: 4,
        radiusMaxPixels: 25,
        radiusUnits: "meters" as const,
        opacity: 0.85,
      }),
    ];
  }, [scoreData, scoreThreshold]);

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
        />
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
            min={0}
            max={1}
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
