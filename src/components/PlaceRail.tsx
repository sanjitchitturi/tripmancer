"use client";

import Link from "next/link";
import { useRef } from "react";
import { PlaceImage } from "@/components/PlaceImage";
import { typicalTripCost } from "@/data/destinations";
import { inr } from "@/lib/format";
import type { Destination } from "@/lib/types";

export function PlaceRail({ places }: { places: Destination[] }) {
  const scroller = useRef<HTMLUListElement>(null);

  function move(direction: number) {
    scroller.current?.scrollBy({ left: direction * 292, behavior: "smooth" });
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-[14px] text-white/70">Places you can open</p>
        <div className="flex gap-2">
          <button type="button" className="rail-arrow" aria-label="Previous places" onClick={() => move(-1)}>
            <span aria-hidden="true">‹</span>
          </button>
          <button type="button" className="rail-arrow" aria-label="Next places" onClick={() => move(1)}>
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
      <ul ref={scroller} className="rail-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {places.map((place, index) => {
          const light = index === 1;
          return (
            <li key={place.slug} className="w-[250px] shrink-0 snap-start sm:w-[280px]">
              <Link
                href={`/plan?d=${place.slug}`}
                className={`flex h-[360px] flex-col overflow-hidden rounded-[22px] p-4 no-underline ${
                  light ? "bg-paper text-ink-deep" : "border border-white/10 bg-[#12141c] text-white"
                }`}
              >
                <span className="block text-[18px] leading-6 font-[600]">{place.name}</span>
                <span className={`mt-2 line-clamp-3 block text-[14px] leading-5 ${light ? "text-ink-deep/70" : "text-white/65"}`}>
                  {place.summary}
                </span>
                <span className="mt-3 block text-[13px]">{inr(typicalTripCost(place, "lon"))}</span>
                <span
                  className={`mt-3 inline-flex h-8 w-fit items-center rounded-full px-3 text-[13px] font-[560] ${
                    light ? "bg-ink-deep text-white" : "bg-paper text-ink-deep"
                  }`}
                >
                  Plan
                </span>
                <span className="photo-frame relative mt-4 min-h-0 flex-1 overflow-hidden rounded-[16px]">
                  <PlaceImage src={place.photo} alt={place.photoAlt} position={place.photoPosition} sizes="280px" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
