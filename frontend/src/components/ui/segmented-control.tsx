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
      className="flex w-full gap-1 p-1 rounded-lg bg-surface border border-border-subtle"
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
            className={`flex-1 flex items-center justify-center rounded-md py-1.5 px-0.5 text-label font-medium leading-none truncate transition-all duration-150 ${
              active
                ? "bg-primary/20 text-primary shadow-sm shadow-primary/10"
                : "text-fg-muted hover:text-fg-secondary hover:bg-surface"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
