"use client";

import { useState } from "react";
import { Clock, MapPin, Navigation, Star } from "lucide-react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
  MarkerTooltip,
} from "@/components/ui/map";
import { cn } from "@/lib/utils";

type Band = "top" | "mid" | "risk" | "empty";

type AuditPoint = {
  id: string;
  name: string;
  rank: number | null;
  dist: string;
  lng: number;
  lat: number;
  band: Band;
};

// Business sits in downtown Austin; sample points orbit it inside the
// 4.5 mi audit radius. Ranks mirror the hero grid's Today state.
const BUSINESS = { lng: -97.7431, lat: 30.2672 };

const POINTS: AuditPoint[] = [
  { id: "hyde-park", name: "Hyde Park", rank: 2, dist: "1.8 mi", lng: -97.7331, lat: 30.2932, band: "top" },
  { id: "zilker", name: "Zilker", rank: 4, dist: "2.1 mi", lng: -97.7731, lat: 30.2472, band: "mid" },
  { id: "east-austin", name: "East Austin", rank: 1, dist: "1.2 mi", lng: -97.7231, lat: 30.2672, band: "top" },
  { id: "soco", name: "South Congress", rank: 7, dist: "1.5 mi", lng: -97.7431, lat: 30.2452, band: "mid" },
  { id: "mueller", name: "Mueller", rank: 3, dist: "3.2 mi", lng: -97.7031, lat: 30.2972, band: "top" },
  { id: "west-lake", name: "West Lake", rank: 14, dist: "4.1 mi", lng: -97.8031, lat: 30.2672, band: "risk" },
  { id: "round-rock", name: "Round Rock", rank: null, dist: "4.4 mi", lng: -97.7431, lat: 30.3312, band: "empty" },
];

const BAND_DOT: Record<Band, string> = {
  top: "bg-ink text-canvas",
  mid: "bg-block-lime text-ink border border-black/10",
  risk: "bg-block-coral text-ink border border-black/10",
  empty: "bg-canvas/90 text-ink border border-dashed border-hairline",
};

const BAND_LABEL: Record<Band, string> = {
  top: "Top 3 — in the pack",
  mid: "Rank 4–10",
  risk: "Rank 13+",
  empty: "Outside the top 20",
};

export default function GeoLiveMap() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = POINTS.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="h-[380px] w-full md:h-[440px]">
      <Map center={[BUSINESS.lng, BUSINESS.lat]} zoom={10.5}>
        <MapMarker longitude={BUSINESS.lng} latitude={BUSINESS.lat}>
          <MarkerContent>
            <span className="relative flex size-7 items-center justify-center rounded-full bg-ink text-canvas shadow-lg">
              <MapPin className="size-4" aria-hidden="true" />
            </span>
            <MarkerLabel position="bottom">Your business</MarkerLabel>
          </MarkerContent>
        </MapMarker>

        {POINTS.map((point) => (
          <MapMarker
            key={point.id}
            longitude={point.lng}
            latitude={point.lat}
            onClick={() => setSelectedId(point.id)}
          >
            <MarkerContent>
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[10px] leading-none font-semibold tabular-nums shadow-lg transition-transform hover:scale-110",
                  BAND_DOT[point.band],
                )}
              >
                {point.rank ?? "–"}
              </span>
            </MarkerContent>
            <MarkerTooltip>
              {point.rank === null
                ? `${point.name} · outside top 20`
                : `${point.name} · rank ${point.rank} · ${point.dist}`}
            </MarkerTooltip>
          </MapMarker>
        ))}

        {selected && (
          <MarkerPopup
            longitude={selected.lng}
            latitude={selected.lat}
            onClose={() => setSelectedId(null)}
          >
            <div className="p-1">
              <p className="caption text-ink">
                &ldquo;emergency plumber near me&rdquo;
              </p>
              <h3 className="body-sm mt-1 font-semibold text-ink">
                {selected.name} ·{" "}
                {selected.rank === null
                  ? "outside top 20"
                  : `rank ${selected.rank}`}
              </h3>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-ink">
                <Star className="size-3.5 fill-ink text-ink" aria-hidden="true" />
                <span className="font-medium">
                  {selected.rank === null ? "Not ranked" : `Rank ${selected.rank}`}
                </span>
                <span className="caption">{BAND_LABEL[selected.band]}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-sm text-ink">
                <Clock className="size-3.5" aria-hidden="true" />
                <span>
                  {selected.dist} from business · Jul 2025
                </span>
              </div>
              <a
                href="#free-audit"
                className="caption mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-pill bg-ink px-4 py-2 text-canvas"
              >
                <Navigation className="size-3.5" aria-hidden="true" />
                Get this coverage
              </a>
            </div>
          </MarkerPopup>
        )}
      </Map>
    </div>
  );
}
