"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

interface Props {
  visible: boolean;
  label?: string;
}

/**
 * Full-viewport loading veil. Shown during the brief window between page
 * mount and when all persisted stores + city config are ready. Stays
 * mounted during its own exit animation so the handoff to the real UI is
 * smooth.
 */
export function LoadingScreen({ visible, label = "Loading your search…" }: Props) {
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const id = setTimeout(() => setMounted(false), 350);
    return () => clearTimeout(id);
  }, [visible, mounted]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-0 z-[70] flex items-center justify-center ${
        visible
          ? "animate-in fade-in duration-200"
          : "animate-out fade-out duration-350 pointer-events-none"
      }`}
    >
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(14,14,24,0.98)] via-[rgba(12,12,22,1)] to-[rgba(10,10,18,1)]" />

      {/* Subtle map-grid suggestion, very low opacity */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 75%)",
        }}
      />

      {/* Soft primary-tinted radial glow behind the mark */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 420px 420px at center, var(--color-primary, rgba(99,102,241,0.5)) 0%, transparent 70%)",
          opacity: 0.08,
        }}
      />

      <div className="relative flex flex-col items-center gap-4">
        {/* Brand mark with an orbiting arc */}
        <div className="relative w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-2xl shadow-primary/10">
          <MapPin size={24} className="text-primary/80" />
          <div className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-primary animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">
            Optim · house
          </span>
          <span className="text-[12px] text-white/40">{label}</span>
        </div>
      </div>
    </div>
  );
}
