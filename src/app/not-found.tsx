import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap page flex flex-1 items-center">
      <div>
        <p className="eyebrow">404</p>
        <h1 className="display mt-3">Page not found</h1>
        <p className="lede mt-5">The place may have been renamed, or the link is old.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/explore" className="btn btn-primary">
            Explore places
          </Link>
          <Link href="/plan" className="btn btn-quiet">
            Plan a trip
          </Link>
        </div>
      </div>
    </div>
  );
}
