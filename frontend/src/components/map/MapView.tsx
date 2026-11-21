"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
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
  Grid2x2,
  Grid3x3,
  LayoutGrid,
  Maximize,
  Filter,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { isScorable, useCriteriaStore, useHeatmapStale } from "@/stores/criteria-store";
import { useRentalStore } from "@/stores/rental-store";
import { useAgentStore } from "@/stores/agent-store";
import { fetchCellEvidence } from "@/lib/api";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapLegend } from "./MapLegend";
import { RightDock } from "./RightDock";
import { scoreToRgb } from "@/lib/score-scale";
import { ScoreAction } from "./ScoreAction";
import { FloatingChat } from "@/components/agent/FloatingChat";
import { WelcomeChat } from "@/components/agent/WelcomeChat";
import { RentalListCard } from "@/components/rentals/RentalListCard";
import { RentalPriceMarker } from "@/components/map/RentalPriceMarker";
import { POIMarker } from "@/components/map/POIMarker";
import type { CellEvidence } from "@/lib/types";
import {
  GRID_RESOLUTION_CONFIG,
  hasCommuteDestination,
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

  } = useCriteriaStore(
    useShallow((s) => ({
      cityConfig: s.cityConfig,
      criteria: s.criteria,
      scoreData: s.scoreData,
      selectedCellId: s.selectedCellId,
      setSelectedCellId: s.setSelectedCellId,
      scoreThreshold: s.scoreThreshold,
      setScoreThreshold: s.setScoreThreshold,
      gridResolution: s.gridResolution,
      setGridResolution: s.setGridResolution,

    })),
  );

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

  const hasActiveCriteria = criteria.some(isScorable);
  const scoreEmptyReason =
    criteria.length === 0
      ? "Add a criterion to score"
      : criteria.some((c) => c.enabled && c.type === "commute" && !isScorable(c))
        ? "Set a commute destination"
        : "Turn on a criterion to score";

  const destinations = useMemo(
    () =>
      criteria
        .filter(
          (c) =>
            c.type === "commute" &&
            hasCommuteDestination((c.params as CommuteParams).destination),
        )
        .map((c) => {
          const params = c.params as CommuteParams;
          return {
            id: c.id,
            lat: params.destination.lat,
            lng: params.destination.lng,
            label: params.label || c.label,
            icon: c.icon,
          };
        }),
    [criteria]
  );
  // ── Cell inspector ─────────────────────────────────────────────────────────
  // The store's `selectedCellId` is the single source of truth. Local inspector
  // data (area name, evidence, centre) is tagged with the cell it belongs to and
  // is ignored as soon as it no longer matches — so a scenario switch or reset
  // that clears the selection can't leave a stale card open.
  const [inspector, setInspector] = useState<{
    cellId: string;
    /** World-coord center of the clicked cell. Drives the "evidence" overlay. */
    center: [number, number] | null;
    areaName: string | null;
    evidence: CellEvidence | null;
  } | null>(null);
  const evidenceAbortRef = useRef<AbortController | null>(null);
  const activeInspector =
    inspector && inspector.cellId === selectedCellId ? inspector : null;
  const clickedCenter = activeInspector?.center ?? null;
  const cellEvidence = activeInspector?.evidence ?? null;

  /** Patch inspector data only if it still belongs to `cellId` (drops late responses). */
  const patchInspector = useCallback(
    (cellId: string, patch: Partial<NonNullable<typeof inspector>>) =>
      setInspector((prev) => (prev && prev.cellId === cellId ? { ...prev, ...patch } : prev)),
    [],
  );

  // Derived from the current heatmap, so a re-score shows fresh numbers.
  const selectedCellProperties = useMemo<Record<string, unknown> | null>(() => {
    if (!selectedCellId || !scoreData?.features) return null;
    const f = scoreData.features.find((x) => x.properties.cell_id === selectedCellId);
    if (!f) return null;
    return {
      hexIndex: f.properties.cell_id,
      weight: f.properties.score,
      center: f.geometry.coordinates,
      ...f.properties,
    };
  }, [selectedCellId, scoreData]);

  // Click-time name (zone or reverse-geocoded) first; for a restored/deep-linked
  // selection fall back to the zone name carried on the cell itself.
  const areaName =
    activeInspector?.areaName ??
    ((selectedCellProperties?.zone_name as string | undefined) || null);



  const heatmapStale = useHeatmapStale();
  const scoringLoading = useCriteriaStore((s) => s.loading);
  const heatmapDimmed = heatmapStale || scoringLoading;

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
        // Out-of-date or recomputing heatmaps stay visible but recede.
        opacity: heatmapDimmed ? 0.45 : 1,
        getHexagon: (d: (typeof data)[0]) => d.hexIndex,
        getFillColor: (d: (typeof data)[0]) => {
          if (d.weight < scoreThreshold) return [0, 0, 0, 0];
          const [r, g, b] = scoreToRgb(d.weight);
          if (!selectedCellId) return [r, g, b, 216];
          // Spotlight via the blue border (see getLineColor); keep the fill
          // semi-transparent on the selected cell so POI markers rendered
          // inside it remain readable. Surrounding cells fade further.
          return d.cell_id === selectedCellId
            ? [r, g, b, 150]
            : [r, g, b, 30];
        },
        getLineColor: (d: (typeof data)[0]) =>
          d.cell_id === selectedCellId ? [96, 165, 250, 255] : [0, 0, 0, 0],
        getLineWidth: (d: (typeof data)[0]) =>
          d.cell_id === selectedCellId ? 2 : 0,
        lineWidthUnits: "pixels",
        lineWidthMinPixels: 0,
        updateTriggers: {
          getFillColor: [selectedCellId, scoreThreshold],
          getLineColor: [selectedCellId],
          getLineWidth: [selectedCellId],
        },
        pickable: true,
        stroked: true,
        filled: true,
        extruded: false,
        highPrecision: true,
        transitions: {
          getLineWidth: { duration: 220 },
        },
      }),
    ];
  }, [scoreData, scoreThreshold, selectedCellId, heatmapDimmed]);

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
        if (!hasCommuteDestination(p.destination)) continue;
        const { lat, lng } = p.destination;
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

  const clearRentals = useRentalStore((s) => s.clear);
  const rentalListings = useRentalStore((s) => s.listings);
  const selectedListingId = useRentalStore((s) => s.selectedListingId);
  const selectListing = useRentalStore((s) => s.selectListing);

  const setChatOpen = useAgentStore((s) => s.setChatOpen);

  // Previous heatmap stays visible while a new score is computing.
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
      evidenceAbortRef.current?.abort();

      if (!info.object || hiddenByThreshold) {
        setSelectedCellId(null);
        setInspector(null);
        clearRentals();
        return;
      }

      const cellId = info.object.cell_id as string;
      if (cellId !== selectedCellId) {
        clearRentals();
      }
      setSelectedCellId(cellId);
      setChatOpen(false);

      const rawCenter = (info.object.center ?? info.coordinate) as
        | [number, number]
        | undefined;
      const center: [number, number] | null =
        rawCenter && rawCenter.length >= 2 ? [rawCenter[0], rawCenter[1]] : null;
      const zoneName = (info.object.zone_name as string | undefined) ?? null;

      setInspector({ cellId, center, areaName: zoneName, evidence: null });

      // Fetch nearby OSM POIs for geo-specific active criteria.
      if (center) {
        const geoSpecificCriteria = criteria
          .filter((c) => c.enabled && ["amenities", "transit", "healthcare"].includes(c.type))
          .map((c) => ({ type: c.type, params: c.params as Record<string, unknown> }));

        if (geoSpecificCriteria.length > 0) {
          const abortCtrl = new AbortController();
          evidenceAbortRef.current = abortCtrl;
          const [lng, lat] = center;
          const cellSizeM = GRID_RESOLUTION_CONFIG[gridResolution].cell_size_m;
          fetchCellEvidence(cityConfig.slug, lat, lng, cellSizeM, geoSpecificCriteria, abortCtrl.signal)
            .then((evidence) => patchInspector(cellId, { evidence }))
            .catch(() => {});
        }
      }

      // Reverse-geocode a name when the backend didn't provide one. The result is
      // tagged to this cell, so a slow response can't rename a later selection.
      if (!zoneName && info.coordinate && info.coordinate.length >= 2) {
        const [lng, lat] = info.coordinate;
        fetch(
          `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&types=neighborhood,locality,place&access_token=${MAPBOX_TOKEN}`
        )
          .then((res) => res.json())
          .then((data) => {
            const feature = data.features?.[0];
            const name = feature?.properties?.name ?? feature?.properties?.full_address ?? null;
            if (name) patchInspector(cellId, { areaName: name });
          })
          .catch(() => {});
      }
    },
    [setSelectedCellId, setChatOpen, scoreThreshold, selectedCellId, clearRentals, criteria, gridResolution, cityConfig.slug, patchInspector]
  );

  const handleCellClose = useCallback(() => {
    evidenceAbortRef.current?.abort();
    setSelectedCellId(null);
    setInspector(null);
    clearRentals();
  }, [setSelectedCellId, clearRentals]);

  return (
    <div className="relative flex h-full w-full">
    <div
      className={`relative h-full min-w-0 flex-1 map-root ${
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
          if (typeof object.score === "number") {
            return `Score: ${((object.score as number) * 100).toFixed(0)}%`;
          }
          return null;
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
          {cellEvidence?.amenities.map((p, i) => (
            <Marker
              key={`am-${i}-${p.lat}-${p.lng}`}
              longitude={p.lng}
              latitude={p.lat}
              anchor="center"
            >
              <POIMarker
                lat={p.lat}
                lng={p.lng}
                category={p.category}
                kind="amenity"
                name={p.name ?? null}
                distance_m={p.distance_m}
              />
            </Marker>
          ))}
          {cellEvidence?.transit.map((p, i) => (
            <Marker
              key={`tr-${i}-${p.lat}-${p.lng}`}
              longitude={p.lng}
              latitude={p.lat}
              anchor="center"
            >
              <POIMarker
                lat={p.lat}
                lng={p.lng}
                category={p.mode}
                kind="transit"
                name={p.name ?? null}
                distance_m={p.distance_m}
              />
            </Marker>
          ))}
          {cellEvidence?.healthcare.map((p, i) => (
            <Marker
              key={`hc-${i}-${p.lat}-${p.lng}`}
              longitude={p.lng}
              latitude={p.lat}
              anchor="center"
            >
              <POIMarker
                lat={p.lat}
                lng={p.lng}
                category={p.facility_type}
                kind="healthcare"
                name={p.name ?? null}
                distance_m={p.distance_m}
              />
            </Marker>
          ))}
          {rentalListings.map((listing) => (
            <Marker
              key={listing.id}
              longitude={listing.lng}
              latitude={listing.lat}
              anchor="bottom"
            >
              <RentalPriceMarker
                listing={listing}
                selected={listing.id === selectedListingId}
                onSelect={() =>
                  selectListing(listing.id === selectedListingId ? null : listing.id)
                }
              />
            </Marker>
          ))}
        </Map>
      </DeckGL>

      <WelcomeChat />

      {/* Map footer: a single row that wraps on narrow widths instead of
          stacking floating cards on top of each other. */}
      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 flex flex-wrap items-end justify-between gap-3">
        {scoreData ? (
          <div className="pointer-events-auto w-[260px] rounded-xl border border-white/[0.1] bg-[rgba(12,12,20,0.88)] px-3.5 py-3 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <MapLegend
              visibleCount={visibleCount}
              totalCount={totalCount}
              threshold={scoreThreshold}
              weakCriteria={Object.entries(scoreData.criterion_status ?? {})
                .filter(([, st]) => st !== "ok")
                .map(([key, st]) => ({
                  label: scoreData.criterion_labels?.[key] ?? key,
                  status: st as "no_variation" | "empty",
                }))}
            />
            <div className="mt-3 border-t border-white/[0.08] pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                  <Filter size={12} aria-hidden />
                  Hide areas below
                </span>
                <span className="text-xs font-semibold tabular-nums text-white">
                  {Math.round(scoreThreshold * 100)}%
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
          </div>
        ) : (
          <span />
        )}

        <div className="pointer-events-auto flex flex-wrap items-stretch justify-end gap-2.5">
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

          <ScoreAction hasCriteria={hasActiveCriteria} emptyReason={scoreEmptyReason} />

          <FloatingChat mode="pill" />
        </div>
      </div>

    </div>

    <RightDock
      area={
        selectedCellProperties ? (
          <RentalListCard
            cellProperties={selectedCellProperties}
            areaName={areaName}
            criterionLabels={scoreData?.criterion_labels}
            onCellClose={handleCellClose}
          />
        ) : null
      }
      onCloseArea={handleCellClose}
    />
    </div>
  );
}
