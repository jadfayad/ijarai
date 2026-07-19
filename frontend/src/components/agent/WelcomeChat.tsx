"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  Briefcase,
  Heart,
  TreePine,
  MessageSquare,
  X,
} from "lucide-react";
import { useAgentStore, useCurrentCityAgentSlice } from "@/stores/agent-store";
import { useCriteriaStore } from "@/stores/criteria-store";
import { useAppReady } from "@/lib/use-app-ready";

interface Persona {
  id: string;
  icon: React.ElementType;
  label: string;
  sub: string;
  prompt: string;
}

/**
 * Per-city fast-start profiles. Each city keeps the same three archetypes
 * (young professional, commuter couple, quiet + parks) but with prompts and
 * sub-labels grounded in that city's real neighborhoods, transit, and
 * landmarks. Keyed by CityConfig.slug; falls back to DEFAULT_PERSONAS.
 */
const PERSONAS_BY_CITY: Record<string, Persona[]> = {
  dubai: [
    {
      id: "young-pro",
      icon: Briefcase,
      label: "Young professional",
      sub: "Walkable, cafes, short commute",
      prompt:
        "I'm a young professional. Build scoring criteria for me: short commute to a central business district, a walkable neighborhood with cafes, gyms, and restaurants, and a reasonable rent budget for a 1-bedroom.",
    },
    {
      id: "couple-commuters",
      icon: Heart,
      label: "Commuter couple",
      sub: "Amazon + DXB, cafes, calm",
      prompt:
        "We're a couple. My girlfriend works at Amazon's offices in Internet City and commutes by public transport — being close to her office is the top priority since she takes transit daily. I travel weekly from DXB Airport, so a reasonable drive to the airport matters too. We love nice coffee places and calm, quiet neighborhoods. Build scoring criteria that reflect this, weighting her commute the highest.",
    },
    {
      id: "quiet-parks",
      icon: TreePine,
      label: "Quiet + parks",
      sub: "Residential, green, low noise",
      prompt:
        "Build criteria for a quiet residential area with parks and green spaces within walking distance. Low noise from highways and nightlife is a priority.",
    },
  ],
  "san-francisco": [
    {
      id: "young-pro",
      icon: Briefcase,
      label: "Young professional",
      sub: "Walkable, cafes, short commute",
      prompt:
        "I'm a young professional. Build scoring criteria for me: short commute to a downtown tech office in SoMa or the Financial District, a walkable neighborhood with cafes, gyms, and restaurants, and a reasonable rent budget for a 1-bedroom.",
    },
    {
      id: "couple-commuters",
      icon: Heart,
      label: "Commuter couple",
      sub: "Downtown + Peninsula, cafes, calm",
      prompt:
        "We're a couple. My partner works in the Financial District and commutes by BART or Muni — being close to a transit line is the top priority since they commute daily. I drive down to the Peninsula a few times a week, so a reasonable route to the 101 or Caltrain matters too. We love good coffee and calm, quiet neighborhoods. Build scoring criteria that reflect this, weighting my partner's transit commute the highest.",
    },
    {
      id: "quiet-parks",
      icon: TreePine,
      label: "Quiet + parks",
      sub: "Residential, green, low noise",
      prompt:
        "Build criteria for a quiet residential area with parks and green spaces within walking distance — think proximity to Golden Gate Park or the Presidio. Low noise from highways and nightlife is a priority.",
    },
  ],
  montreal: [
    {
      id: "young-pro",
      icon: Briefcase,
      label: "Young professional",
      sub: "Walkable, cafes, short commute",
      prompt:
        "I'm a young professional. Build scoring criteria for me: short métro commute to downtown (Centre-Ville), a walkable neighborhood like the Plateau with cafes, gyms, and restaurants, and a reasonable rent budget for a 1-bedroom.",
    },
    {
      id: "couple-commuters",
      icon: Heart,
      label: "Commuter couple",
      sub: "Downtown métro, cafes, calm",
      prompt:
        "We're a couple. My partner works downtown near McGill and commutes by métro — being close to a métro station is the top priority since they commute daily. We love good coffee and calm, quiet neighborhoods, and an easy walk to a station matters most. Build scoring criteria that reflect this, weighting my partner's métro commute the highest.",
    },
    {
      id: "quiet-parks",
      icon: TreePine,
      label: "Quiet + parks",
      sub: "Residential, green, low noise",
      prompt:
        "Build criteria for a quiet residential area with parks and green spaces within walking distance — think proximity to Parc du Mont-Royal or Parc La Fontaine. Low noise from highways and nightlife is a priority.",
    },
  ],
  paris: [
    {
      id: "young-pro",
      icon: Briefcase,
      label: "Young professional",
      sub: "Walkable, cafes, short commute",
      prompt:
        "I'm a young professional. Build scoring criteria for me: short Métro commute to a central arrondissement, a walkable neighborhood with cafes, gyms, and restaurants, and a reasonable rent budget for a studio or 1-bedroom.",
    },
    {
      id: "couple-commuters",
      icon: Heart,
      label: "Commuter couple",
      sub: "La Défense, cafes, calm",
      prompt:
        "We're a couple. My partner works at La Défense and commutes by Métro or RER — being close to a fast transit line is the top priority since they commute daily. We love good coffee and both want a calm, quiet neighborhood. Build scoring criteria that reflect this, weighting my partner's transit commute the highest.",
    },
    {
      id: "quiet-parks",
      icon: TreePine,
      label: "Quiet + parks",
      sub: "Residential, green, low noise",
      prompt:
        "Build criteria for a quiet residential area with parks and green spaces within walking distance — think proximity to the Bois de Vincennes or Parc des Buttes-Chaumont. Low noise from traffic and nightlife is a priority.",
    },
  ],
};

const DEFAULT_PERSONAS: Persona[] = PERSONAS_BY_CITY.dubai;

/** Per-city hero input placeholder; falls back to a generic prompt. */
const PLACEHOLDER_BY_CITY: Record<string, string> = {
  dubai: "I work downtown, love walking, and need a gym nearby…",
  "san-francisco": "I work in SoMa, love walking, and need a gym nearby…",
  montreal: "I work downtown, bike everywhere, and want cafes nearby…",
  paris: "I work in the center, love walking, and want cafes nearby…",
};

const DEFAULT_PLACEHOLDER =
  "I work downtown, love walking, and need a gym nearby…";

/**
 * Centered welcome hero shown on a fresh city entry (no criteria, no
 * conversation). Backdrop-dims the rest of the UI to focus the user on
 * telling the assistant what they want. Once a message or persona fires the
 * hero dismounts and FloatingChat takes over (top-right).
 */
export function WelcomeChat() {
  const { messages, isThinking, heroDismissed } = useCurrentCityAgentSlice();
  const sendMessage = useAgentStore((s) => s.sendMessage);
  const dismissHero = useAgentStore((s) => s.dismissHero);
  const criteria = useCriteriaStore((s) => s.criteria);
  const cityName = useCriteriaStore((s) => s.cityConfig.name);
  const citySlug = useCriteriaStore((s) => s.cityConfig.slug);
  const personas = PERSONAS_BY_CITY[citySlug] ?? DEFAULT_PERSONAS;
  const placeholder = PLACEHOLDER_BY_CITY[citySlug] ?? DEFAULT_PLACEHOLDER;
  // Wait for persist hydration + city config before deciding whether to show
  // the hero. Otherwise it briefly renders during refresh before the stores
  // rehydrate.
  const ready = useAppReady();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const visible =
    ready &&
    messages.length === 0 &&
    !isThinking &&
    criteria.length === 0 &&
    !heroDismissed;

  // Keep mounted during exit so the out-animation can play.
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const id = setTimeout(() => setMounted(false), 260);
    return () => clearTimeout(id);
  }, [visible, mounted]);

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => textareaRef.current?.focus(), 220);
    return () => clearTimeout(id);
  }, [visible]);

  if (!mounted) return null;

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center p-4 ${
        visible
          ? "animate-in fade-in duration-300"
          : "animate-out fade-out duration-250 pointer-events-none"
      }`}
    >
      {/* Backdrop — dims everything else. Not clickable-to-dismiss to protect in-progress typing. */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      <div
        className={`relative z-10 w-full max-w-[540px] ${
          visible
            ? "animate-in zoom-in-95 slide-in-from-bottom-4 fade-in duration-400"
            : "animate-out zoom-out-95 slide-out-to-bottom-right-4 fade-out duration-250"
        }`}
        role="dialog"
        aria-label="Start your search"
      >
        <div className="relative rounded-3xl border border-white/[0.1] bg-gradient-to-b from-[rgba(24,24,40,0.95)] to-[rgba(14,14,24,0.97)] backdrop-blur-2xl shadow-2xl shadow-black/60 overflow-hidden">
          {/* Dismiss button */}
          <div className="flex items-center justify-end px-5 pt-4 pb-3">
            <button
              onClick={dismissHero}
              aria-label="Skip welcome"
              title="Skip for now"
              className="text-white/30 hover:text-white/70 p-1.5 rounded-lg hover:bg-white/[0.08] transition-all"
            >
              <X size={15} />
            </button>
          </div>

          <div className="px-7 pb-7 space-y-5">
            {/* Headline */}
            <div className="flex flex-col items-center text-center pt-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-4 ring-1 ring-primary/25">
                <Sparkles size={24} className="text-primary" />
              </div>
              <h2 className="text-[22px] font-semibold text-white tracking-tight leading-tight">
                Where should you live in {cityName}?
              </h2>
              <p className="text-[13px] text-white/40 mt-1.5 max-w-[360px] leading-relaxed">
                Describe what matters to you. I&apos;ll build a scoring setup
                and highlight the best areas on the map.
              </p>
            </div>

            {/* Input */}
            <div className="flex items-end gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-3.5 py-2.5 focus-within:border-primary/40 transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={2}
                aria-label="Describe what you're looking for"
                className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/25 resize-none outline-none max-h-[140px] leading-relaxed"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                aria-label="Send"
                className="p-2 rounded-lg bg-primary/25 text-primary hover:bg-primary/40 disabled:opacity-30 disabled:hover:bg-primary/25 transition-all shrink-0"
              >
                <Send size={15} />
              </button>
            </div>

            {/* Personas — fast starters */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-medium">
                  or start from a profile
                </span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {personas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => sendMessage(p.prompt)}
                    className="group flex flex-col items-start gap-2 p-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.18] hover:-translate-y-0.5 transition-all duration-200 text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary/75 group-hover:bg-primary/25 group-hover:text-primary flex items-center justify-center transition-colors">
                      <p.icon size={14} />
                    </div>
                    <div>
                      <div className="text-[12px] font-medium text-white/85 group-hover:text-white leading-tight">
                        {p.label}
                      </div>
                      <div className="text-[10px] text-white/30 group-hover:text-white/55 leading-snug mt-0.5">
                        {p.sub}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Skip link */}
            <div className="flex justify-center pt-1">
              <button
                onClick={dismissHero}
                className="inline-flex items-center gap-1.5 text-[11px] text-white/35 hover:text-white/70 transition-colors"
              >
                <MessageSquare size={11} />
                Or set up criteria manually
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
