import Link from "next/link";
import { PlaceImage } from "@/components/PlaceImage";
import { ShortlistButton } from "@/components/ShortlistButton";
import { getOrigin, typicalTripCost } from "@/data/destinations";
import { inr } from "@/lib/format";
import type { Destination, OriginId } from "@/lib/types";

export function DestinationCard({
  place,
  originId,
  saved,
  onToggle,
  comparing,
  onCompare,
}: {
  place: Destination;
  originId: OriginId;
  saved: boolean;
  onToggle: (slug: string) => void;
  comparing?: boolean;
  onCompare?: () => void;
}) {
  const origin = getOrigin(originId);
  return (
    <article className="destination-card group flex h-full flex-col">
      <div className="relative">
        <Link href={`/destinations/${place.slug}`} className="media aspect-[4/3]" tabIndex={-1} aria-hidden="true">
          <PlaceImage
            src={place.photo}
            alt={place.photoAlt}
            position={place.photoPosition}
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 400px"
          />
        </Link>
        <div className="absolute top-3 right-3">
          <ShortlistButton overlay saved={saved} name={place.name} onToggle={() => onToggle(place.slug)} />
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
            <Link href={`/destinations/${place.slug}`}>{place.name}</Link>
          </h2>
          <p className="text-[14px] text-subtle">
            {place.country} · {place.vibe}
          </p>
        </div>
        <p className="shrink-0 text-right">
          <span className="figure block text-[17px]">{inr(typicalTripCost(place, originId))}</span>
          <span className="block text-[12px] text-subtle">from {origin.name}</span>
        </p>
      </div>
      <p className="mt-3 line-clamp-2 text-[15px] leading-6 text-muted">{place.summary}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
        <Link href={`/plan?d=${place.slug}`} className="btn btn-primary btn-sm">
          Plan
        </Link>
        <Link href={`/destinations/${place.slug}`} className="btn btn-quiet btn-sm">
          Details
        </Link>
        {onCompare ? (
          <button
            type="button"
            className={`chip ml-auto ${comparing ? "is-on" : ""}`}
            aria-pressed={Boolean(comparing)}
            onClick={onCompare}
          >
            {comparing ? "Comparing" : "Compare"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
