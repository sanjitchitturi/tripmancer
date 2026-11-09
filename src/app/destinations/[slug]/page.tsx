import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DestinationActions } from "@/components/DestinationActions";
import { PlaceImage } from "@/components/PlaceImage";
import { copy } from "@/content/copy";
import { destinations, getDestination } from "@/data/destinations";
import { emptyInput } from "@/lib/defaults";
import { encodePlan, decodePlan } from "@/lib/share";
import { inr, monthList } from "@/lib/format";

export function generateStaticParams() {
  return destinations.map((place) => ({ slug: place.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const place = getDestination(slug);
  if (!place) return { title: "Place" };
  return { title: place.name, description: place.summary };
}

type GuideProps = { params: Promise<{ slug: string }>; searchParams: Promise<{ p?: string }> };

export default function DestinationPage(props: GuideProps) {
  return <Suspense fallback={<p className="wrap page" role="status">Opening city guide…</p>}><Guide {...props} /></Suspense>;
}

async function Guide({ params, searchParams }: GuideProps) {
  const { slug } = await params;
  const place = getDestination(slug);
  if (!place) notFound();

  const { p } = await searchParams;
  const brief = typeof p === "string" ? decodePlan(p) : null;
  const base = brief?.destinationSlug === place.slug ? brief : { ...emptyInput(), destinationSlug: place.slug };
  return (
    <article className="wrap page">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[14px] text-subtle">
        <Link href="/explore" className="transition-colors hover:text-fg">
          Explore
        </Link>
        <span aria-hidden="true">/</span>
        <span>{place.country}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
        <div>
          <h1 className="display">{place.name}</h1>
          <p className="lede mt-5">{place.summary}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={"/plan?p=" + encodePlan(base)} className="btn btn-primary btn-lg">
            Plan this trip
          </Link>
          <DestinationActions slug={place.slug} name={place.name} />
        </div>
      </div>

      <div className="media mt-10 aspect-[4/3] sm:aspect-[16/9] lg:mt-12 lg:aspect-[21/9]">
        <PlaceImage
          src={place.photo}
          alt={place.photoAlt}
          position={place.photoPosition}
          sizes="(max-width: 1240px) 100vw, 1240px"
          eager
        />
      </div>

      <div className="mt-16 grid gap-14 lg:mt-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <section>
          <h2 className="title-sm">Neighborhoods</h2>
          <dl className="mt-6 grid gap-6">
            <Note title="Areas" body={place.areas.join(", ")} />
            <Note title="Stay" body={place.go} />
            <Note title="Skip" body={place.skip} />
            <Note title="Eat" body={place.eat} />
            <Note title="Entry" body={place.visa ?? copy.domesticVisa} />
            {place.poorReason ? (
              <Note title="Timing" body={`${place.poorReason} ${monthList(place.suggestedMonths)} are easier.`} />
            ) : null}
          </dl>
        </section>

        <section>
          <h2 className="title-sm">Experiences</h2>
          <ul className="mt-6 border-b border-line">
            {place.activities.map((activity) => (
              <li key={activity.id} className="border-t border-line py-5">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-semibold">{activity.name}</p>
                  <p className="figure shrink-0 text-[15px]">{activity.cost === 0 ? "Free" : inr(activity.cost)}</p>
                </div>
                <p className="mt-0.5 text-[13px] text-subtle">
                  {activity.area} · {activity.time}
                </p>
                <p className="mt-2 leading-7 text-muted">{activity.blurb}</p>
                <Link className="editorial-link" href={'/plan?p=' + encodePlan({ ...base, pinnedActivityIds: [activity.id], interests: activity.interests, dayPlan: [], excludedActivityIds: [] })}>Build a trip around this<span className="sr-only"> — {activity.name}</span></Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-12"><h2 className="title-sm">When to go and what to budget</h2>
      <dl className="mt-10 grid gap-3 sm:grid-cols-3 lg:mt-12">
        <Fact label="Best months" value={monthList(place.goodMonths)} />
        <Fact label="Flight from London" value={`${inr(place.flights.lon)} per person`} />
        <Fact label="Comfort stay" value={`${inr(place.stay.comfort)} a night`} />
      </dl>

      </section>
      <div className="cta-band mt-16 flex flex-col gap-6 lg:mt-20 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="title-sm">Plan {place.name} with your dates</h2>
          <p className="mt-2 max-w-[56ch] leading-7 text-muted">{copy.estimateNote}</p>
        </div>
        <Link href={"/plan?p=" + encodePlan(base)} className="btn btn-primary btn-lg shrink-0">
          Plan this trip
        </Link>
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-5 py-4">
      <dt className="label">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function Note({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-6">
      <dt className="font-semibold">{title}</dt>
      <dd className="leading-7 text-muted">{body}</dd>
    </div>
  );
}
