import Link from "next/link";
import { PlaceImage } from "@/components/PlaceImage";
import { destinations } from "@/data/destinations";

export default function Home() {
  const lisbon = destinations.find(place => place.slug === "lisbon")!;
  const guides = ["tokyo", "seoul", "goa"]
    .map((slug) => destinations.find((place) => place.slug === slug))
    .filter((place): place is NonNullable<typeof place> => Boolean(place));
  return <div className="wrap editorial-home">
    <section className="cover">
      <div className="cover-copy">
        <p className="eyebrow">Portugal · City guide</p>
        <h1>Lisbon</h1>
        <p className="cover-intro">A morning in Baixa.</p>
        <p>Start at the market, then head to a cooking class. Build the rest of your stay around that morning.</p>
        <Link className="btn btn-primary" href="/destinations/lisbon">Explore Lisbon <span aria-hidden="true">↗</span></Link>
        <Link className="editorial-link" href="/explore#experiences">Find a trip around an experience</Link>
      </div>
      <figure><div className="cover-photo"><PlaceImage src={lisbon.photo} alt={lisbon.photoAlt} sizes="(min-width: 768px) 60vw, 95vw" eager /></div><figcaption>Lisbon, Portugal</figcaption></figure>
    </section>
    <section className="guide-shelf"><header><h2 className="title">City guides</h2><Link className="editorial-link" href="/explore">All destinations →</Link></header>
    <div className="guide-grid">{guides.map(place => <Link key={place.slug} href={'/destinations/' + place.slug}>
      <div className="media aspect-[4/3]"><PlaceImage src={place.photo} alt={place.photoAlt} position={place.photoPosition} sizes="(min-width: 768px) 32vw, 95vw" /></div>
      <p className="label mt-4">{place.country}</p><h3 className="title-sm">{place.name}</h3></Link>)}</div></section>
  </div>;
}
