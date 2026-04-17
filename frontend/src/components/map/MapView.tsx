"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";
import Map, { Marker } from "react-map-gl/mapbox";
import { DeckGL } from "@deck.gl/react";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { LineLayer, ScatterplotLayer } from "@deck.gl/layers";

luma.registerAdapters([webgl2Adapter]);
import {
  MapPin,
  Briefcase,
  Plane,
  Heart,
  Users,
  GraduationCap,
  Dumbbell,
  Sparkles,
  Grid2x2,
  Grid3x3,
  LayoutGrid,
  Maximize,
  Filter,
  Square,
} from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CellPopup } from "./CellPopup";
import { MapLegend } from "./MapLegend";
import { SetupWizard } from "@/components/criteria/SetupWizard";
import {
  GRID_RESOLUTION_CONFIG,
  type AiParams,
  type AiPoiResult,
  type AiZoneScore,
  type CommuteParams,
  type GridResolution,
} from "@/lib/types";
import "mapbox-gl/dist/mapbox-gl.css";

const RESOLUTION_ICONS: Record<GridResolution, React.ReactNode> = {
  coarse: <Grid2x2 size={14} />,
  normal: <Grid3x3 size={14} />,
  fine: <LayoutGrid size={14} />,
  max: <Maximize size={14} />,
};

const ICON_MAP: Record<string, typeof MapPin> = {
  briefcase: Briefcase,
  plane: Plane,
  heart: Heart,
  users: Users,
  "graduation-cap": GraduationCap,
  dumbbell: Dumbbell,
  "map-pin": MapPin,
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

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

export function MapView() {
  const {
    cityConfig,
    criteria,
    scoreData,
    selectedCellId,
    setSelectedCellId,
    scoreThreshold,
    setScoreThreshold,
    gridResolution,
    setGridResolution,
    loading,
    generate,
    cancelGeneration,
    wizardOpen,
    setWizardOpen,
  } = useCriteriaStore();

  const cityView = useMemo(
    () => ({
      longitude: cityConfig.center_lng,
      latitude: cityConfig.center_lat,
      zoom: cityConfig.default_zoom,
      pitch: 0,
      bearing: 0,
    }),
    [cityConfig]
  );

  const hasActiveCriteria = criteria.length > 0;
  const showWizard = wizardOpen;

  const destinations = useMemo(
    () =>
      criteria
        .filter((c) => c.type === "commute")
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
  const [areaName, setAreaName] = useState<string | null>(null);
  /** World-coord center of the clicked cell. Drives the "evidence" overlay. */
  const [clickedCenter, setClickedCenter] = useState<[number, number] | null>(
    null
  );

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

  const animFrameRef = useRef<number | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevScoreDataRef = useRef<typeof scoreData>(null);

  useEffect(() => {
    const isNewData = scoreData !== prevScoreDataRef.current;
    prevScoreDataRef.current = scoreData;

    if (delayTimerRef.current != null) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (!isNewData || !scoreData?.features?.length) {
      setScoreThreshold(scoreRange.min);
      return;
    }

    const from = scoreRange.min;
    const target = Math.min(0.6, scoreRange.max);
    if (target <= from) {
      setScoreThreshold(from);
      return;
    }

    setScoreThreshold(from);

    delayTimerRef.current = setTimeout(() => {
      delayTimerRef.current = null;
      const durationMs = 1400;
      const startTime = performance.now();

      function step(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = from + (target - from) * eased;
        setScoreThreshold(value);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          animFrameRef.current = null;
        }
      }

      animFrameRef.current = requestAnimationFrame(step);
    }, 600);

    return () => {
      if (delayTimerRef.current != null) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      if (animFrameRef.current != null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [scoreData, scoreRange.min, scoreRange.max, setScoreThreshold]);

  const layers = useMemo(() => {
    if (!scoreData?.features?.length) return [];

    // Keep all cells in the data array across threshold changes so row indices
    // stay stable. Below-threshold cells are hidden by returning alpha 0 in
    // getFillColor. Filtering `data` by threshold would re-index everything on
    // every slider tick and cause deck.gl's attribute transition to
    // interpolate colors between unrelated cells — colors looked "relative".
    const data = scoreData.features.map((f) => ({
      hexIndex: f.properties.cell_id as string,
      weight: f.properties.score as number,
      center: f.geometry.coordinates as [number, number],
      ...f.properties,
    }));

    return [
      new H3HexagonLayer({
        id: "score-cells",
        data,
        getHexagon: (d: (typeof data)[0]) => d.hexIndex,
        getFillColor: (d: (typeof data)[0]) => {
          if (d.weight < scoreThreshold) return [0, 0, 0, 0];
          const [r, g, b] = scoreToColor(d.weight, scoreRange.min, scoreRange.max);
          if (!selectedCellId) return [r, g, b, 216];
          // Spotlight the selected cell; others fade into the background.
          return d.cell_id === selectedCellId
            ? [r, g, b, 255]
            : [r, g, b, 40];
        },
        getLineColor: (d: (typeof data)[0]) =>
          d.cell_id === selectedCellId ? [255, 255, 255, 235] : [0, 0, 0, 0],
        getLineWidth: (d: (typeof data)[0]) =>
          d.cell_id === selectedCellId ? 2 : 0,
        lineWidthUnits: "pixels",
        lineWidthMinPixels: 0,
        updateTriggers: {
          getFillColor: [selectedCellId, scoreThreshold, scoreRange.min, scoreRange.max],
          getLineColor: [selectedCellId],
          getLineWidth: [selectedCellId],
        },
        pickable: true,
        opacity: 1,
        stroked: true,
        filled: true,
        extruded: false,
        highPrecision: true,
        transitions: {
          getLineWidth: { duration: 220 },
        },
      }),
    ];
  }, [scoreData, scoreThreshold, scoreRange, selectedCellId]);

  /**
   * Evidence overlay layers: plotted when a cell is clicked, showing the raw
   * research each active criterion is using at that location.
   * - Commute arcs: clicked cell → each commute destination
   * - AI zone circles: soft violet radii from the AI criterion's research
   * - AI POI pins: points the AI researched, sized by their weight
   */
  const evidenceLayers = useMemo(() => {
    if (!clickedCenter) return [];
    const activeCriteria = criteria.filter((c) => c.enabled);

    const commuteArcs: {
      source: [number, number];
      target: [number, number];
      label: string;
    }[] = [];
    const aiZones: (AiZoneScore & { critId: string })[] = [];
    const aiPois: (AiPoiResult & { critId: string })[] = [];

    for (const c of activeCriteria) {
      if (c.type === "commute") {
        const p = c.params as CommuteParams;
        const { lat, lng } = p.destination;
        if (lat === 0 && lng === 0) continue;
        commuteArcs.push({
          source: clickedCenter,
          target: [lng, lat],
          label: p.label ?? c.label,
        });
      } else if (c.type === "ai") {
        const p = c.params as AiParams;
        for (const z of p.zones ?? []) aiZones.push({ ...z, critId: c.id });
        for (const poi of p.pois ?? []) aiPois.push({ ...poi, critId: c.id });
      }
    }

    const layers: (LineLayer | ScatterplotLayer)[] = [];

    if (aiZones.length) {
      layers.push(
        new ScatterplotLayer({
          id: "evidence-ai-zones",
          data: aiZones,
          // Zone center stored as [lat, lng] in the backend — flip for deck.gl.
          getPosition: (d: AiZoneScore) => [d.center[1], d.center[0]],
          getRadius: (d: AiZoneScore) => d.radius_km * 1000,
          radiusUnits: "meters",
          getFillColor: [167, 139, 250, 46], // violet-400 @ ~18% alpha
          getLineColor: [167, 139, 250, 130],
          stroked: true,
          lineWidthMinPixels: 1.5,
          filled: true,
          pickable: false,
        }),
      );
    }

    if (aiPois.length) {
      layers.push(
        new ScatterplotLayer({
          id: "evidence-ai-pois",
          data: aiPois,
          getPosition: (d: AiPoiResult) => [d.lng, d.lat],
          getRadius: (d: AiPoiResult) =>
            6 + Math.min(Math.max(d.weight ?? 1, 0.5), 4) * 2,
          radiusUnits: "pixels",
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          getFillColor: [251, 191, 36, 220], // amber-400
          getLineColor: [255, 255, 255, 180],
          stroked: true,
          lineWidthMinPixels: 1,
          filled: true,
          pickable: false,
        }),
      );
    }

    if (commuteArcs.length) {
      layers.push(
        new LineLayer({
          id: "evidence-commute-lines",
          data: commuteArcs,
          getSourcePosition: (d: (typeof commuteArcs)[0]) => d.source,
          getTargetPosition: (d: (typeof commuteArcs)[0]) => d.target,
          // Neutral hairline — reads as a connection without competing with
          // the POI/zone layers. Scales cleanly to many destinations.
          getColor: [255, 255, 255, 110],
          getWidth: 1,
          widthUnits: "pixels",
          widthMinPixels: 1,
          widthMaxPixels: 1.5,
          pickable: false,
        }),
      );
    }

    return layers;
  }, [clickedCenter, criteria]);

  const allLayers = useMemo(
    () => [...layers, ...evidenceLayers],
    [layers, evidenceLayers],
  );

  const visibleCount = useMemo(() => {
    if (!scoreData?.features?.length) return 0;
    return scoreData.features.filter(
      (f) => f.properties.score >= scoreThreshold
    ).length;
  }, [scoreData, scoreThreshold]);

  const totalCount = scoreData?.features?.length ?? 0;

  const handleClick = useCallback(
    (info: { object?: Record<string, unknown>; x?: number; y?: number; coordinate?: number[] }) => {
      // Below-threshold cells are rendered at alpha 0 but still pickable (we
      // intentionally keep them in the data array to avoid color transition
      // artifacts). Ignore clicks on them.
      const hiddenByThreshold =
        info.object &&
        typeof info.object.score === "number" &&
        (info.object.score as number) < scoreThreshold;
      if (info.object && !hiddenByThreshold) {
        const cellId = info.object.cell_id as string;
        setSelectedCellId(cellId);
        setPopupInfo({
          x: info.x ?? 0,
          y: info.y ?? 0,
          properties: info.object,
        });
        const center = (info.object.center ?? info.coordinate) as
          | [number, number]
          | undefined;
        if (center && center.length >= 2) {
          setClickedCenter([center[0], center[1]]);
        }

        const zoneName = info.object.zone_name as string | undefined;
        if (zoneName) {
          setAreaName(zoneName);
        } else {
          setAreaName(null);
          if (info.coordinate && info.coordinate.length >= 2) {
            const [lng, lat] = info.coordinate;
            fetch(
              `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&types=neighborhood,locality,place&access_token=${MAPBOX_TOKEN}`
            )
              .then((res) => res.json())
              .then((data) => {
                const feature = data.features?.[0];
                if (feature) {
                  setAreaName(feature.properties?.name ?? feature.properties?.full_address ?? null);
                }
              })
              .catch(() => {});
          }
        }
      } else {
        setSelectedCellId(null);
        setPopupInfo(null);
        setAreaName(null);
        setClickedCenter(null);
      }
    },
    [setSelectedCellId, scoreThreshold]
  );

  return (
    <div
      className={`relative w-full h-full map-root ${
        selectedCellId ? "cell-focused" : ""
      }`}
    >
      <DeckGL
        initialViewState={cityView}
        controller={true}
        layers={allLayers}
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
                  <div className="bg-primary text-white rounded-full p-2 shadow-lg shadow-primary/40 ring-2 ring-white/25 transition-transform duration-200 group-hover:scale-110">
                    <Icon size={16} />
                  </div>
                  {d.label && (
                    <span className="mt-1.5 px-2.5 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-medium text-white shadow-lg border border-white/[0.1] whitespace-nowrap max-w-[150px] truncate">
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
          areaName={areaName}
          criterionLabels={scoreData?.criterion_labels}
          onClose={() => {
            setPopupInfo(null);
            setSelectedCellId(null);
            setAreaName(null);
            setClickedCenter(null);
          }}
        />
      )}

      {scoreData && (
        <MapLegend
          visibleCount={visibleCount}
          totalCount={totalCount}
          threshold={scoreThreshold}
        />
      )}

      {scoreData && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 min-w-[340px] max-w-[420px] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-[rgba(12,12,20,0.8)] backdrop-blur-2xl rounded-2xl px-6 py-4 shadow-2xl shadow-black/30 border border-white/[0.1]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter size={13} className="text-white/30" />
                <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                  Min score
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-white">
                {Math.round(scoreThreshold * 100)}%
                <span className="text-white/30 font-normal text-xs ml-1.5">
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
        </div>
      )}

      {showWizard && (
        <SetupWizard onComplete={() => setWizardOpen(false)} />
      )}

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="pointer-events-auto flex items-stretch gap-2.5">
          <Select
            value={gridResolution}
            onValueChange={(v) => setGridResolution(v as GridResolution)}
          >
            <SelectTrigger className="!h-11 min-w-[160px] rounded-xl bg-[rgba(16,16,28,0.85)] backdrop-blur-2xl border border-white/[0.12] text-sm font-medium shadow-lg shadow-black/20 hover:bg-[rgba(24,24,40,0.9)] hover:border-white/[0.2] transition-all duration-200 px-3.5 gap-2">
              <SelectValue>
                <span className="flex items-center gap-2">
                  {RESOLUTION_ICONS[gridResolution]}
                  {GRID_RESOLUTION_CONFIG[gridResolution].label}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              side="top"
              sideOffset={8}
              className="bg-[rgba(16,16,28,0.95)] backdrop-blur-2xl border border-white/[0.12] rounded-xl p-1 min-w-[200px]"
            >
              {(
                Object.entries(GRID_RESOLUTION_CONFIG) as [
                  GridResolution,
                  (typeof GRID_RESOLUTION_CONFIG)[GridResolution],
                ][]
              ).map(([key, cfg]) => (
                <SelectItem
                  key={key}
                  value={key}
                  className="rounded-lg px-2.5 py-2 text-sm cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-white/40">
                      {RESOLUTION_ICONS[key as GridResolution]}
                    </span>
                    <span className="flex flex-col">
                      <span className="font-medium leading-tight">
                        {cfg.label}
                      </span>
                      <span className="text-[11px] text-white/35 leading-tight">
                        {cfg.description}
                      </span>
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {loading ? (
            <>
              <Button
                className="h-11 px-8 text-sm font-semibold rounded-xl bg-primary shadow-lg shadow-primary/20 transition-all duration-200 border-0 text-white pointer-events-none"
                size="lg"
                disabled
              >
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
              </Button>
              <Button
                className="h-11 w-11 p-0 rounded-xl bg-[rgba(16,16,28,0.85)] backdrop-blur-2xl border border-white/[0.12] shadow-lg shadow-black/20 hover:bg-white/[0.12] hover:border-white/[0.2] transition-all duration-200 text-white/50 hover:text-white"
                size="icon"
                onClick={cancelGeneration}
              >
                <Square size={14} className="fill-current" />
              </Button>
            </>
          ) : !hasActiveCriteria ? (
            <div className="h-11 px-6 rounded-xl bg-[rgba(16,16,28,0.85)] backdrop-blur-2xl border border-white/[0.12] shadow-lg shadow-black/20 flex items-center gap-2 text-sm font-medium text-white/35 cursor-not-allowed select-none">
              <Sparkles size={14} className="text-white/25" />
              Enable criteria first
            </div>
          ) : (
            <Button
              className="h-11 px-8 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/85 shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 border-0 text-white"
              size="lg"
              onClick={generate}
            >
              <span className="flex items-center gap-2">
                <Sparkles size={15} />
                Generate Heatmap
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
