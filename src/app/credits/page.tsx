import type { Metadata } from "next";
import Link from "next/link";
import catalog from "../../../public/places/catalog.json";

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Image sources and licensing information for TripMancer city guides.",
};

type Photo = {
  city: string;
  source: string;
  creator?: string;
  license?: string;
  rightsReview: string;
};

export default function CreditsPage() {
  const photos = catalog as Photo[];
  return (
    <article className="wrap page">
      <p className="eyebrow">Image library</p>
      <h1 className="display mt-3">Photo credits</h1>
      <p className="lede mt-5">
        Each city image is recorded with its source. The five refreshed images retain the photographer credit supplied on their individual Unsplash pages.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {photos.map((photo) => (
          <li key={photo.city} className="card p-5">
            <h2 className="title-sm capitalize">{photo.city.replaceAll("-", " ")}</h2>
            <p className="mt-2 text-muted">{photo.creator ? `Photo by ${photo.creator}` : "Source recorded in the image catalog"}</p>
            <p className="mt-1 text-[14px] text-muted">{photo.license ?? "License review pending"}</p>
            <a className="editorial-link mt-4 inline-block" href={photo.source} target="_blank" rel="noreferrer">
              View source
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-sm text-muted">
        Image source notes are maintained with the app at <code>public/places/catalog.json</code>. See the <Link className="editorial-link" href="/company">company page</Link> for how guide content and estimates are handled.
      </p>
    </article>
  );
}
