"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

function DubaiSkyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M30,100 L30,65 L35,65 L35,55 L38,55 L38,100 Z" />
      <path d="M50,100 L50,50 L53,50 L53,40 L55,40 L55,30 L56,30 L56,20 L57,8 L58,20 L58,30 L59,30 L59,40 L61,40 L61,50 L64,50 L64,100 Z" />
      <path d="M75,100 L75,55 L78,48 L80,55 L80,100 Z" />
      <path d="M90,100 L90,60 L95,60 L95,45 L98,45 L98,60 L103,60 L103,100 Z" />
      <path d="M115,100 L115,50 L118,50 L118,42 L121,38 L124,42 L124,50 L127,50 L127,100 Z" />
      <path d="M140,100 L140,58 L145,58 L145,100 Z" />
      <path d="M155,100 L155,52 L158,52 L158,46 L162,46 L162,52 L165,52 L165,100 Z" />
      <rect x="0" y="98" width="200" height="2" />
    </svg>
  );
}

function NewYorkSkyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20,100 L20,55 L25,55 L25,50 L28,50 L28,55 L33,55 L33,100 Z" />
      <path d="M40,100 L40,45 L44,45 L44,40 L46,40 L46,35 L47,28 L48,35 L48,40 L50,40 L50,45 L54,45 L54,100 Z" />
      <path d="M62,100 L62,50 L68,50 L68,100 Z" />
      <path d="M75,100 L75,42 L79,42 L79,35 L82,30 L85,35 L85,42 L89,42 L89,100 Z" />
      <path d="M96,100 L96,48 L101,48 L101,100 Z" />
      <path d="M108,100 L108,38 L111,38 L111,14 L112.5,6 L114,14 L114,38 L117,38 L117,100 Z" />
      <path d="M125,100 L125,44 L130,44 L130,100 Z" />
      <path d="M138,100 L138,50 L143,50 L143,42 L147,42 L147,50 L152,50 L152,100 Z" />
      <path d="M160,100 L160,55 L166,55 L166,100 Z" />
      <path d="M174,100 L174,48 L180,48 L180,100 Z" />
      <rect x="0" y="98" width="200" height="2" />
    </svg>
  );
}

function LondonSkyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M25,100 L25,55 L30,55 L30,48 L33,48 L33,55 L38,55 L38,100 Z" />
      <path d="M50,100 L50,45 L53,45 L53,35 L54.5,18 L55,15 L55.5,18 L56,35 L58,45 L58,100 Z" />
      <path d="M68,100 L68,50 L72,50 L72,38 L74,34 L76,38 L76,50 L80,50 L80,100 Z" />
      <circle cx="100" cy="55" r="18" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <rect x="99" y="73" width="2" height="27" />
      <path d="M125,100 L125,52 L130,52 L130,100 Z" />
      <path d="M140,100 L140,30 L142,28 L143,12 L144,28 L146,30 L146,100 Z" />
      <path d="M155,100 L155,48 L160,48 L160,40 L163,40 L163,48 L168,48 L168,100 Z" />
      <rect x="0" y="98" width="200" height="2" />
    </svg>
  );
}

function SingaporeSkyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M25,100 L25,55 L30,55 L30,45 L33,45 L33,55 L38,55 L38,100 Z" />
      <path d="M48,100 L48,50 L53,50 L53,100 Z" />
      <path d="M62,100 L62,42 L66,42 L66,35 L70,35 L70,42 L74,42 L74,100 Z" />
      <path d="M85,100 L85,40 L89,40 L89,100 Z" />
      <path d="M95,100 L95,38 L99,38 L99,100 Z" />
      <path d="M105,100 L105,40 L109,40 L109,100 Z" />
      <path d="M83,40 L83,36 L111,36 L111,40 Z" />
      <ellipse cx="97" cy="30" rx="20" ry="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M130,100 L130,48 L134,48 L134,38 L137,30 L140,38 L140,48 L144,48 L144,100 Z" />
      <path d="M155,100 L155,55 L160,55 L160,100 Z" />
      <path d="M168,100 L168,50 L173,50 L173,100 Z" />
      <rect x="0" y="98" width="200" height="2" />
    </svg>
  );
}

function HongKongSkyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18,100 L18,55 L22,55 L22,100 Z" />
      <path d="M28,100 L28,48 L32,48 L32,100 Z" />
      <path d="M38,100 L38,40 L41,40 L41,32 L43,28 L45,32 L45,40 L48,40 L48,100 Z" />
      <path d="M55,100 L55,35 L58,35 L58,25 L60,18 L62,25 L62,35 L65,35 L65,100 Z" />
      <path d="M72,100 L72,42 L76,42 L76,100 Z" />
      <path d="M82,100 L82,30 L85,30 L85,22 L87,15 L89,22 L89,30 L92,30 L92,100 Z" />
      <path d="M100,100 L100,38 L104,38 L104,100 Z" />
      <path d="M112,100 L112,32 L115,32 L115,24 L117,20 L119,24 L119,32 L122,32 L122,100 Z" />
      <path d="M130,100 L130,44 L134,44 L134,100 Z" />
      <path d="M142,100 L142,50 L146,50 L146,100 Z" />
      <path d="M154,100 L154,55 L158,55 L158,100 Z" />
      <path d="M165,100 L165,48 L170,48 L170,100 Z" />
      <path d="M177,100 L177,58 L182,58 L182,100 Z" />
      <rect x="0" y="98" width="200" height="2" />
    </svg>
  );
}

function TokyoSkyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M25,100 L25,50 L30,50 L30,42 L33,42 L33,50 L38,50 L38,100 Z" />
      <path d="M50,100 L50,55 L55,55 L55,100 Z" />
      <path d="M65,100 L65,48 L68,48 L68,20 L69,16 L69.5,8 L70,16 L70,20 L72,48 L75,48 L75,100 Z" />
      <ellipse cx="69.5" cy="22" rx="5" ry="2.5" />
      <path d="M88,100 L88,42 L92,42 L92,35 L95,35 L95,42 L99,42 L99,100 Z" />
      <path d="M110,100 L110,50 L115,50 L115,100 Z" />
      <path d="M125,100 L125,45 L128,45 L128,25 L129,20 L129.5,10 L130,20 L130,25 L132,45 L135,45 L135,100 Z" />
      <ellipse cx="129.5" cy="27" rx="4.5" ry="2" />
      <path d="M148,100 L148,52 L153,52 L153,100 Z" />
      <path d="M163,100 L163,48 L167,48 L167,40 L170,40 L170,48 L174,48 L174,100 Z" />
      <rect x="0" y="98" width="200" height="2" />
    </svg>
  );
}

function SydneySkyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20,100 L20,55 L25,55 L25,100 Z" />
      <path d="M32,100 L32,50 L36,50 L36,42 L39,42 L39,50 L43,50 L43,100 Z" />
      <path d="M55,80 L60,65 L62,80 Z M62,80 L67,62 L69,80 Z M69,80 L74,58 L76,80 Z" />
      <path d="M55,80 L76,80 L76,100 L55,100 Z" />
      <path d="M90,100 Q90,60 115,50 Q120,48 125,50 Q150,60 150,100 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M95,100 L95,90 L100,85 L105,82 L110,80 L115,79 L120,78 L125,79 L130,80 L135,82 L140,85 L145,90 L145,100 Z" opacity="0.15" />
      <path d="M160,100 L160,48 L164,48 L164,40 L167,40 L167,48 L171,48 L171,100 Z" />
      <path d="M178,100 L178,55 L183,55 L183,100 Z" />
      <rect x="0" y="98" width="200" height="2" />
    </svg>
  );
}

function ParisSkyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20,100 L20,52 L24,52 L24,45 L27,45 L27,52 L31,52 L31,100 Z" />
      <path d="M42,100 L42,55 L47,55 L47,100 Z" />
      <path d="M60,100 L60,48 L64,48 L64,40 L67,40 L67,48 L71,48 L71,100 Z" />
      <path d="M85,100 L97,55 L97,40 L98,30 L98.5,18 L99,10 L99.5,18 L100,30 L100,40 L100,55 L112,100 Z" />
      <path d="M90,85 L107,85" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M93,72 L104,72" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M125,100 L125,50 L129,50 L129,42 L132,38 L135,42 L135,50 L139,50 L139,100 Z" />
      <path d="M150,100 L150,55 L155,55 L155,100 Z" />
      <path d="M165,100 L165,48 L169,48 L169,100 Z" />
      <path d="M177,100 L177,52 L182,52 L182,100 Z" />
      <rect x="0" y="98" width="200" height="2" />
    </svg>
  );
}

function TorontoSkyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M22,100 L22,55 L27,55 L27,100 Z" />
      <path d="M35,100 L35,48 L39,48 L39,40 L42,40 L42,48 L46,48 L46,100 Z" />
      <path d="M58,100 L58,52 L63,52 L63,100 Z" />
      <path d="M75,100 L75,45 L78,45 L78,25 L79,20 L79.5,8 L80,20 L80,25 L82,45 L85,45 L85,100 Z" />
      <ellipse cx="79.5" cy="27" rx="5.5" ry="3" />
      <path d="M98,100 L98,42 L102,42 L102,35 L105,35 L105,42 L109,42 L109,100 Z" />
      <path d="M120,100 L120,50 L125,50 L125,100 Z" />
      <path d="M135,100 L135,55 L139,55 L139,48 L142,48 L142,55 L146,55 L146,100 Z" />
      <path d="M158,100 L158,52 L163,52 L163,100 Z" />
      <path d="M172,100 L172,58 L177,58 L177,100 Z" />
      <rect x="0" y="98" width="200" height="2" />
    </svg>
  );
}

function BerlinSkyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20,100 L20,55 L25,55 L25,100 Z" />
      <path d="M35,100 L35,50 L39,50 L39,42 L42,42 L42,50 L46,50 L46,100 Z" />
      <path d="M58,100 L58,55 L63,55 L63,100 Z" />
      <path d="M75,100 L75,48 L78,48 L78,30 L79,25 L79.5,10 L80,25 L80,30 L82,48 L85,48 L85,100 Z" />
      <ellipse cx="79.5" cy="32" rx="4.5" ry="2.5" />
      <path d="M98,65 L98,55 L100,55 L100,65 Z M104,65 L104,55 L106,55 L106,65 Z M110,65 L110,55 L112,55 L112,65 Z M114,65 L114,55 L116,55 L116,65 Z M120,65 L120,55 L122,55 L122,65 Z" />
      <path d="M96,65 L124,65 L124,100 L96,100 Z" />
      <path d="M96,55 L100,48 L104,52 L108,45 L112,52 L116,48 L120,52 L124,55 L96,55 Z" />
      <path d="M140,100 L140,52 L145,52 L145,100 Z" />
      <path d="M155,100 L155,48 L159,48 L159,40 L162,40 L162,48 L166,48 L166,100 Z" />
      <path d="M175,100 L175,55 L180,55 L180,100 Z" />
      <rect x="0" y="98" width="200" height="2" />
    </svg>
  );
}

function SanFranciscoSkyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18,100 L18,52 L22,52 L22,44 L25,44 L25,52 L29,52 L29,100 Z" />
      <path d="M38,100 L38,48 L42,48 L42,38 L44,34 L46,38 L46,48 L50,48 L50,100 Z" />
      <path d="M58,100 L58,55 L63,55 L63,100 Z" />
      <path d="M72,100 L72,42 L75,42 L75,32 L77,28 L79,32 L79,42 L82,42 L82,100 Z" />
      <path d="M90,100 L90,50 L94,50 L94,100 Z" />
      <path d="M100,80 C105,50 110,40 120,35 C130,40 135,50 140,80 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M108,80 L108,75 L110,73 L112,75 L112,80 Z" />
      <path d="M125,80 L125,72 L128,70 L131,72 L131,80 Z" />
      <path d="M100,80 L140,80 L140,100 L100,100 Z" opacity="0.15" />
      <path d="M150,100 L150,45 L153,45 L153,35 L155,30 L157,35 L157,45 L160,45 L160,100 Z" />
      <path d="M168,100 L168,52 L173,52 L173,100 Z" />
      <path d="M180,100 L180,48 L185,48 L185,100 Z" />
      <rect x="0" y="98" width="200" height="2" />
    </svg>
  );
}

const skylines: Record<string, React.FC<{ className?: string }>> = {
  dubai: DubaiSkyline,
  "new-york": NewYorkSkyline,
  london: LondonSkyline,
  singapore: SingaporeSkyline,
  "hong-kong": HongKongSkyline,
  tokyo: TokyoSkyline,
  sydney: SydneySkyline,
  paris: ParisSkyline,
  toronto: TorontoSkyline,
  berlin: BerlinSkyline,
  "san-francisco": SanFranciscoSkyline,
};

const cities = [
  { name: "Dubai", slug: "dubai", country: "UAE", available: true },
  { name: "San Francisco", slug: "san-francisco", country: "USA", available: true },
  { name: "New York", slug: "new-york", country: "USA", available: false },
  { name: "London", slug: "london", country: "UK", available: false },
  { name: "Singapore", slug: "singapore", country: "Singapore", available: false },
  { name: "Hong Kong", slug: "hong-kong", country: "China", available: false },
  { name: "Tokyo", slug: "tokyo", country: "Japan", available: false },
  { name: "Sydney", slug: "sydney", country: "Australia", available: false },
  { name: "Paris", slug: "paris", country: "France", available: false },
  { name: "Toronto", slug: "toronto", country: "Canada", available: false },
  { name: "Berlin", slug: "berlin", country: "Germany", available: false },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/[0.08] via-transparent to-transparent" />

      <div className="relative z-10 w-full max-w-5xl space-y-12 px-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium tracking-wide text-primary uppercase">
            <MapPin className="h-3 w-3" />
            AI agents for home search
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
            Your perfect home exists.
            <br />
            <span className="font-serif italic font-normal text-primary/80">We'll find it.</span>
          </h1>
          <p className="mx-auto max-w-lg text-base text-muted-foreground leading-relaxed">
            Tell us your commute, lifestyle, and budget. We'll show you exactly where to live and what to rent.
          </p>
        </div>

        {/* City Grid */}
        <div className="space-y-5">
          <p className="text-center text-xs font-medium text-muted-foreground/60 uppercase tracking-[0.2em]">
            Where are you looking?
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {cities.map((city) => {
              const Skyline = skylines[city.slug];
              return (
                <button
                  key={city.slug}
                  onClick={() => city.available && router.push(`/${city.slug}`)}
                  className={`group relative flex flex-col items-center overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
                    city.available
                      ? "border-primary/30 bg-primary/[0.04] hover:border-primary/60 hover:bg-primary/[0.08] hover:scale-[1.04] cursor-pointer shadow-lg shadow-primary/[0.04] hover:shadow-xl hover:shadow-primary/10"
                      : "border-border/50 bg-card/50 cursor-default"
                  }`}
                >
                  <div className={`relative w-full flex items-end justify-center pt-5 px-4 h-24 ${
                    city.available ? "text-primary/40 group-hover:text-primary/60" : "text-muted-foreground/15"
                  } transition-colors duration-300`}>
                    {Skyline && <Skyline className="w-full h-16" />}
                  </div>

                  <div className="relative w-full px-4 pb-4 pt-2 text-center">
                    <span className={`text-sm font-semibold tracking-tight ${
                      city.available ? "text-foreground" : "text-muted-foreground/50"
                    }`}>
                      {city.name}
                    </span>
                    <span className={`block text-[10px] uppercase tracking-widest mt-0.5 ${
                      city.available ? "text-muted-foreground" : "text-muted-foreground/30"
                    }`}>
                      {city.country}
                    </span>
                  </div>

                  {!city.available && (
                    <span className="absolute top-2.5 right-2.5 rounded-md bg-muted/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Soon
                    </span>
                  )}

                  {city.available && (
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-primary/10 group-hover:ring-primary/20 transition-all duration-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
