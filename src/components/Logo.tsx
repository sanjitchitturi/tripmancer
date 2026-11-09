import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" aria-label="TripMancer home" className="brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/wordmark-ink.svg" alt="TripMancer" width="136" height="35" />
    </Link>
  );
}
