"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Briefcase,
  Plane,
  Heart,
  Users,
  GraduationCap,
  Dumbbell,
  MapPin,
  Trees,
  Wallet,
  Star,
  VolumeX,
  Sparkles,
  Send,
  Bot,
  ChevronLeft,
} from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import {
  createCommuteCriterion,
  createAmenityCriterion,
  createBudgetCriterion,
  createNeighborhoodCriterion,
  createNoiseCriterion,
  createAiCriterion,
} from "@/stores/criteria-store";
import { COMMUTE_PRESETS } from "@/lib/types";
import type { CommutePreset } from "@/lib/types";

const COMMUTE_ICONS: Record<string, React.ReactNode> = {
  briefcase: <Briefcase size={14} />,
  plane: <Plane size={14} />,
  heart: <Heart size={14} />,
  users: <Users size={14} />,
  "graduation-cap": <GraduationCap size={14} />,
  dumbbell: <Dumbbell size={14} />,
  "map-pin": <MapPin size={14} />,
};

const SINGLETON_CRITERIA = [
  {
    id: "amenities",
    type: "amenities",
    label: "Nearby Amenities",
    icon: <Trees size={14} />,
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-400",
    create: () => createAmenityCriterion(),
  },
  {
    id: "budget",
    type: "budget",
    label: "Budget / Rent",
    icon: <Wallet size={14} />,
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-400",
    create: () => createBudgetCriterion(),
  },
  {
    id: "neighborhood",
    type: "neighborhood",
    label: "Neighborhood Quality",
    icon: <Star size={14} />,
    iconBg: "bg-purple-500/10",
    iconText: "text-purple-400",
    create: () => createNeighborhoodCriterion(),
  },
  {
    id: "noise",
    type: "noise",
    label: "Low Noise",
    icon: <VolumeX size={14} />,
    iconBg: "bg-slate-500/10",
    iconText: "text-slate-400",
    create: () => createNoiseCriterion(),
  },
] as const;

const PLACEHOLDER_SUGGESTIONS = [
  "I want to live near good coffee shops",
  "Quiet area with parks for my dog",
  "Close to nightlife but affordable",
];

export function AddCriterionDialog() {
  const { criteria, addCriterion, resolveDefaultDest } = useCriteriaStore();
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const handleChatSend = () => {
    const text = chatInput.trim();
    if (!text) return;

    addCriterion(createAiCriterion(text));
    setChatInput("");
    setChatOpen(false);
    setOpen(false);
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
        width: rect.width,
        maxHeight: rect.top - 16,
        overflowY: "auto",
      });
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setChatOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const availableSingletons = SINGLETON_CRITERIA.filter(
    (s) => !criteria.some((c) => c.id === s.id)
  );

  const handleAddCommute = (preset: CommutePreset) => {
    const presetCfg = COMMUTE_PRESETS.find((p) => p.preset === preset)!;
    const defaultDest = resolveDefaultDest(presetCfg.icon);
    const criterion = createCommuteCriterion(preset, {
      lat: defaultDest.lat,
      lng: defaultDest.lng,
      label: defaultDest.label,
    });
    addCriterion(criterion);
    setOpen(false);
  };

  const handleAddSingleton = (s: (typeof SINGLETON_CRITERIA)[number]) => {
    addCriterion(s.create());
    setOpen(false);
  };

  return (
    <div className="w-full">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/[0.1] text-white/30 hover:text-white/50 hover:border-white/[0.18] hover:bg-white/[0.03] transition-all duration-200 text-xs font-medium"
      >
        <Plus size={14} />
        Add criterion
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className="z-[100] bg-[rgba(16,16,28,0.95)] backdrop-blur-2xl rounded-xl border border-white/[0.1] shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          {chatOpen ? (
            /* ── Chat-only view ── */
            <div className="p-3 space-y-2.5">
              <div className="flex items-center gap-2 px-0.5">
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-1 -ml-0.5 rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all duration-150"
                >
                  <ChevronLeft size={14} />
                </button>
                <Sparkles size={11} className="text-violet-400" />
                <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
                  AI Preferences
                </span>
                <div className="flex-1" />
                <span className="text-[9px] text-violet-400/50 bg-violet-500/10 px-1.5 py-0.5 rounded-full font-medium">
                  Preview
                </span>
              </div>

              <div className="rounded-lg bg-black/20 border border-white/[0.05] p-2.5">
                <div className="flex flex-col items-center py-5 gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/[0.1] flex items-center justify-center">
                    <Bot size={18} className="text-violet-400/60" />
                  </div>
                  <p className="text-[11px] text-white/30 text-center leading-relaxed max-w-[220px]">
                    Describe what you're looking for and I'll turn it into
                    search criteria.
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                    {PLACEHOLDER_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setChatInput(s);
                          chatInputRef.current?.focus();
                        }}
                        className="text-[10px] text-violet-300/50 hover:text-violet-300/80 bg-violet-500/[0.06] hover:bg-violet-500/[0.12] border border-violet-500/[0.08] hover:border-violet-500/[0.15] px-2 py-1 rounded-md transition-all duration-150"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-end gap-1.5">
                <textarea
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="e.g. Near parks and good schools..."
                  rows={1}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-violet-500/30 rounded-lg px-3 py-2 text-[11px] text-white/80 placeholder:text-white/20 outline-none resize-none transition-colors duration-200"
                />
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim()}
                  className="p-2 rounded-lg bg-violet-500/15 border border-violet-500/15 text-violet-400 hover:bg-violet-500/25 hover:border-violet-500/25 disabled:opacity-30 disabled:hover:bg-violet-500/15 transition-all duration-150 shrink-0"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          ) : (
            /* ── Criteria menu view ── */
            <>
              <div className="p-3">
                <div className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-2 px-1">
                  Commute
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {COMMUTE_PRESETS.map((p) => (
                    <button
                      key={p.preset}
                      onClick={() => handleAddCommute(p.preset)}
                      className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white/80 transition-all duration-150"
                    >
                      <span className="text-white/40">
                        {COMMUTE_ICONS[p.icon]}
                      </span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {availableSingletons.length > 0 && (
                <>
                  <div className="h-px bg-white/[0.06] mx-3" />
                  <div className="p-3">
                    <div className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-2 px-1">
                      Other
                    </div>
                    <div className="space-y-0.5">
                      {availableSingletons.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleAddSingleton(s)}
                          className="w-full flex items-center gap-2.5 text-xs px-3 py-2 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white/80 transition-all duration-150"
                        >
                          <span className={`${s.iconBg} ${s.iconText} p-1.5 rounded-md`}>
                            {s.icon}
                          </span>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="h-px bg-white/[0.06] mx-3" />
              <div className="p-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setChatOpen(true);
                    setTimeout(() => chatInputRef.current?.focus(), 100);
                  }}
                  className="w-full flex items-center gap-2.5 text-xs px-3 py-2.5 rounded-lg bg-gradient-to-r from-violet-500/[0.08] to-blue-500/[0.08] border border-violet-500/[0.12] hover:border-violet-500/[0.22] hover:from-violet-500/[0.12] hover:to-blue-500/[0.12] text-white/60 hover:text-white/80 transition-all duration-200 group"
                >
                  <span className="bg-violet-500/15 text-violet-400 p-1.5 rounded-md group-hover:scale-110 transition-transform duration-200">
                    <Sparkles size={14} />
                  </span>
                  <span className="flex flex-col items-start">
                    <span className="font-medium text-white/70 group-hover:text-white/90">
                      Describe a preference
                    </span>
                    <span className="text-[10px] text-white/30">
                      Let AI create criteria for you
                    </span>
                  </span>
                </button>
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
