"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface Suggestion {
  place_name: string;
  center: [number, number]; // [lng, lat]
}

interface Props {
  value: string;
  onSelect: (result: { lat: number; lng: number; display_name: string }) => void;
  placeholder?: string;
  className?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Dubai bounding box: [minLng, minLat, maxLng, maxLat]
const DUBAI_BBOX = "54.89,24.78,55.87,25.51";

export function AddressAutocomplete({
  value,
  onSelect,
  placeholder = "Search for an address...",
  className,
}: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const fetchSuggestions = useCallback(async (text: string) => {
    if (!text.trim() || !MAPBOX_TOKEN) {
      setSuggestions([]);
      return;
    }

    try {
      const encoded = encodeURIComponent(text.trim());
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
        `?access_token=${MAPBOX_TOKEN}` +
        `&autocomplete=true` +
        `&bbox=${DUBAI_BBOX}` +
        `&limit=5` +
        `&types=address,poi,place,locality,neighborhood`;

      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(
        (data.features ?? []).map((f: { place_name: string; center: [number, number] }) => ({
          place_name: f.place_name,
          center: f.center,
        }))
      );
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);
    setActiveIndex(-1);
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
  };

  const handleSelect = (suggestion: Suggestion) => {
    const [lng, lat] = suggestion.center;
    setQuery(suggestion.place_name);
    setSuggestions([]);
    setOpen(false);
    onSelect({ lat, lng, display_name: suggestion.place_name });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
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
      <Input
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          {suggestions.map((s, i) => (
            <li
              key={s.place_name + i}
              onMouseDown={() => handleSelect(s)}
              className={`cursor-pointer px-2.5 py-1.5 text-xs transition-colors ${
                i === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              }`}
            >
              {s.place_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
