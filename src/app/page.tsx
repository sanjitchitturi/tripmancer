import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import Link from "next/link";
import { PlaceImage } from "@/components/PlaceImage";
import { destinations } from "@/data/destinations";

const featured = destinations.find(({ slug }) => slug === "lisbon")!;
const guides = [
  { slug: "tokyo", note: "Explore a different neighborhood each day." },
  { slug: "seoul", note: "Start at the palace, then head to a night market." },
  { slug: "goa", note: "Pick a base near the beaches you want to visit." },
].flatMap(({ slug, note }) =>
  destinations.filter((place) => place.slug === slug).map((place) => ({ place, note })),
);

export default function Home() {
  return (
    <div className="wrap">
      <section className="cover" aria-labelledby="home-title">
        <div className="cover-copy">
          <p className="eyebrow">City guides & trip planning</p>
          <h1 id="home-title">Where to next?</h1>
          <p className="cover-intro">
            Find a city you’d love to visit, then build a day-by-day itinerary around what you want to do.
          </p>
          <div className="cover-actions">
            <Link className="btn btn-primary" href="/plan">
              Plan a trip <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="editorial-link" href="/explore#experiences">Search by activity</Link>
          </div>
        </div>
        <Link className="cover-feature" href={`/destinations/${featured.slug}`}>
          <div className="cover-photo">
            <PlaceImage
              src={featured.photo}
              alt={featured.photoAlt}
              position={featured.photoPosition}
              sizes="(min-width: 1280px) 640px, (min-width: 900px) 54vw, 95vw"
              eager
            />
          </div>
          <div className="cover-caption">
            <div>
              <p className="eyebrow">Featured city guide</p>
              <p className="cover-location"><MapPin size={17} aria-hidden="true" /> Lisbon, Portugal</p>
            </div>
            <span className="guide-arrow"><ArrowUpRight size={20} aria-hidden="true" /></span>
          </div>
        </Link>
      </section>

      <section className="guide-shelf" aria-labelledby="guides-title">
        <header>
          <div>
            <p className="eyebrow">Explore destinations</p>
            <h2 className="title" id="guides-title">City guides</h2>
          </div>
          <Link className="editorial-link" href="/explore">All destinations <span aria-hidden="true">→</span></Link>
        </header>
        <div className="guide-grid">
          {guides.map(({ place, note }) => (
            <Link className="guide-card" key={place.slug} href={`/destinations/${place.slug}`}>
              <div className="guide-photo">
                <PlaceImage src={place.photo} alt={place.photoAlt} position={place.photoPosition} sizes="(min-width: 720px) 33vw, 95vw" />
              </div>
              <div className="guide-card-body">
                <div>
                  <p className="eyebrow">{place.country}</p>
                  <h3 className="title-sm">{place.name}</h3>
                  <p className="guide-note">{note}</p>
                </div>
                <span className="guide-arrow"><ArrowUpRight size={18} aria-hidden="true" /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
