"use client";

import {
  forwardRef,
  useImperativeHandle,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Input } from "@/components/ui/input";

export interface AddressAutocompleteHandle {
  focus: () => void;
}

interface Prediction {
  place_id: string;
  description: string;
}

interface Props {
  value: string;
  onSelect: (result: { lat: number; lng: number; display_name: string }) => void;
  placeholder?: string;
  className?: string;
  centerLat?: number;
  centerLng?: number;
  countryCode?: string;
  autoFocus?: boolean;
}

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";

async function fetchAutocomplete(
  input: string,
  center: { latitude: number; longitude: number },
  countryCode: string
): Promise<Prediction[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
    },
    body: JSON.stringify({
      input,
      locationBias: {
        circle: { center, radius: 50000.0 },
      },
      includedRegionCodes: [countryCode],
    }),
  });

  if (!res.ok) return [];
  const data = await res.json();

  return (
    data.suggestions
      ?.map((s: { placePrediction?: { placeId?: string; text?: { text?: string } } }) => ({
        place_id: s.placePrediction?.placeId,
        description: s.placePrediction?.text?.text,
      }))
      .filter((p: Prediction) => p.place_id && p.description) ?? []
  );
}

async function fetchPlaceLocation(placeId: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "location",
    },
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data.location) return null;

  return { lat: data.location.latitude, lng: data.location.longitude };
}

export const AddressAutocomplete = forwardRef<AddressAutocompleteHandle, Props>(function AddressAutocomplete(
  {
    value,
    onSelect,
    placeholder = "Search for an address...",
    className,
    centerLat = 25.2048,
    centerLng = 55.2708,
    countryCode = "ae",
    autoFocus = false,
  },
  ref,
) {
  const center = useMemo(
    () => ({ latitude: centerLat, longitude: centerLng }),
    [centerLat, centerLng]
  );
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }), []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleFetch = useCallback(async (text: string) => {
    if (!text.trim()) {
      setPredictions([]);
      return;
    }
    const results = await fetchAutocomplete(text.trim(), center, countryCode);
    setPredictions(results);
  }, [center, countryCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);
    setActiveIndex(-1);
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleFetch(text), 200);
  };

  const handleSelect = async (prediction: Prediction) => {
    setQuery(prediction.description);
    setPredictions([]);
    setOpen(false);

    const location = await fetchPlaceLocation(prediction.place_id);
    onSelect({
      lat: location?.lat ?? 0,
      lng: location?.lng ?? 0,
      display_name: prediction.description,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || predictions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < predictions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : predictions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(predictions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <label className="sr-only" htmlFor="address-autocomplete-input">
        {placeholder}
      </label>
      <Input
        id="address-autocomplete-input"
        ref={inputRef}
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        className={className}
        autoFocus={autoFocus}
        aria-label={placeholder}
        aria-autocomplete="list"
        aria-expanded={open && predictions.length > 0}
      />
      {open && predictions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-white/[0.08] bg-black/70 backdrop-blur-2xl shadow-2xl">
          {predictions.map((p, i) => (
            <li
              key={p.place_id}
              onMouseDown={() => handleSelect(p)}
              className={`cursor-pointer px-3 py-2 text-xs transition-colors first:rounded-t-xl last:rounded-b-xl ${
                i === activeIndex
                  ? "bg-white/[0.08] text-foreground"
                  : "hover:bg-white/[0.05] text-muted-foreground"
              }`}
            >
              {p.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
