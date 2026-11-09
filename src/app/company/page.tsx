import type { Metadata } from "next";
import Link from "next/link";
import { PlaceImage } from "@/components/PlaceImage";
import { destinations, origins } from "@/data/destinations";

export const metadata: Metadata = {
  title: "About",
  description: "What TripMancer does, how the prices work, and where bookings are completed.",
};

export default function CompanyPage() {
  const lead = destinations.find((item) => item.slug === "lisbon");
  return (
    <article>
      <section className="wrap page grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="eyebrow">About</p>
          <h1 className="display mt-4">TripMancer</h1>
          <p className="lede mt-6">
            A planner for people leaving major cities. Set a budget in dollars. TripMancer builds the days, the room, and a
            flight estimate. You book on the partner site, with the number already in hand.
          </p>
          <Link href="/plan" className="btn btn-primary mt-8">
            Plan a trip
          </Link>
        </div>
        {lead ? (
          <div className="media aspect-[4/3]">
            <PlaceImage
              src={lead.photo}
              alt={lead.photoAlt}
              position={lead.photoPosition}
              sizes="(max-width: 1024px) 100vw, 50vw"
              eager
            />
          </div>
        ) : null}
      </section>

      <section id="estimates" className="border-t border-line scroll-mt-24">
        <div className="wrap grid gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <Note
            title="Who it is for"
            body={`Travelers leaving ${origins.map((origin) => origin.name).join(", ")}. This version covers ${destinations.length} cities, with a typical cost from each of those airports.`}
          />
          <Note
            title="How a plan is made"
            body="Discovery matches your words to catalog activities and checks each itinerary against your budget. The planner runs in your browser and shows the costs for the whole group."
          />
          <Note
            title="Prices and bookings"
            body="Every dollar figure is a typical estimate, not a live fare. Flight, stay, and activity buttons open a partner with your dates filled in. TripMancer does not charge your card. If a partner affiliate id is set, that partner can pay a commission when a booking completes. The price on the partner site is the price you pay."
          />
          <Note
            title="Your account"
            body="Explore cities and save plans on this device. Sign in to keep trips and your shortlist across devices."
          />
        </div>
      </section>

      <section className="border-t border-line">
        <div className="wrap py-16 sm:py-20 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Places</p>
              <h2 className="title mt-3">In this version</h2>
            </div>
            <Link href="/explore" className="link-arrow">
              Explore
            </Link>
          </div>
          <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((item) => (
              <li key={item.slug}>
                <Link href={`/destinations/${item.slug}`} className="group block">
                  <span className="media aspect-[4/3]">
                    <PlaceImage src={item.photo} alt="" position={item.photoPosition} sizes="(max-width: 640px) 100vw, 33vw" />
                  </span>
                  <span className="mt-3 block text-[13px] text-subtle">{item.country}</span>
                  <span className="mt-0.5 block text-[20px] font-semibold tracking-[-0.02em]">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </article>
  );
}

function Note({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="title-sm">{title}</h2>
      <p className="mt-4 max-w-[48ch] leading-7 text-muted">{body}</p>
    </section>
  );
}
