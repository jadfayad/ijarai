"use client";

interface Option<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  "aria-label"?: string;
}

export function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
}: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex w-full gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06]"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            role="radio"
            aria-checked={active}
            type="button"
            onClick={() => onChange(opt.value)}
            title={opt.label}
            className={`flex-1 flex items-center justify-center rounded-md py-1.5 px-0.5 text-[11px] font-medium leading-none truncate transition-all duration-150 ${
              active
                ? "bg-primary/20 text-primary shadow-sm shadow-primary/10"
                : "text-white/55 hover:text-white/80 hover:bg-white/[0.04]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export const WEIGHT_OPTIONS = [
  { value: 10, label: "Essential" },
  { value: 8, label: "Important" },
  { value: 6, label: "Preferred" },
  { value: 4, label: "Nice" },
  { value: 2, label: "Optional" },
] as const;

export function weightToSegment(weight: number): number {
  // Snap arbitrary 1–10 weights to the nearest segment value
  const segments = WEIGHT_OPTIONS.map((o) => o.value);
  return segments.reduce((best, cur) =>
    Math.abs(cur - weight) < Math.abs(best - weight) ? cur : best,
  segments[0]);
}

export function weightLabel(weight: number): string {
  const snapped = weightToSegment(weight);
  return WEIGHT_OPTIONS.find((o) => o.value === snapped)?.label ?? "";
}
