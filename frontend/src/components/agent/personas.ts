import type { ElementType } from "react";
import { Briefcase, Heart, TreePine } from "lucide-react";

export interface Persona {
  id: string;
  icon: ElementType;
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
export const PERSONAS_BY_CITY: Record<string, Persona[]> = {
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

export const DEFAULT_PERSONAS: Persona[] = PERSONAS_BY_CITY.dubai;

/** Per-city hero input placeholder; falls back to a generic prompt. */
export const PLACEHOLDER_BY_CITY: Record<string, string> = {
  dubai: "I work downtown, love walking, and need a gym nearby…",
  "san-francisco": "I work in SoMa, love walking, and need a gym nearby…",
  montreal: "I work downtown, bike everywhere, and want cafes nearby…",
  paris: "I work in the center, love walking, and want cafes nearby…",
};

export const DEFAULT_PLACEHOLDER =
  "I work downtown, love walking, and need a gym nearby…";

export function personasFor(citySlug: string): Persona[] {
  return PERSONAS_BY_CITY[citySlug] ?? DEFAULT_PERSONAS;
}

export function placeholderFor(citySlug: string): string {
  return PLACEHOLDER_BY_CITY[citySlug] ?? DEFAULT_PLACEHOLDER;
}
