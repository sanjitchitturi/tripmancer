"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { useAccount } from "@/components/useAccount";
import { destinations } from "@/data/destinations";
import { logout } from "@/lib/account";

const links = [
  { href: "/explore", label: "Destinations" },
  { href: "/plan", label: "Plan a trip" },
  { href: "/trips", label: "My trips" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const loginHref = pathname === "/plan" || pathname.startsWith("/trips") ? "/login?next=" + encodeURIComponent(pathname + (search ? "?" + search : "")) : "/login";
  const [error, setError] = useState("");
  async function signOut() {
    try { await logout(); setError(""); }
    catch { setError("Sign-out failed. Please try again."); }
  }
  const account = useAccount();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const signedIn = account.ready && Boolean(account.session);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenOn(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className={`site-header no-print ${open ? "is-open" : ""}`}>
      <div className="wrap site-header-inner">
        <Logo />
        <nav className="site-nav" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link"
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="site-actions">
          {!account.ready ? (
            <span className="nav-link invisible" aria-hidden="true">
              Log in
            </span>
          ) : signedIn ? (
            <button type="button" className="nav-link" onClick={() => void signOut()}>
              Log out
            </button>
          ) : (
            <Link href={loginHref} className="nav-link" aria-current={isActive(pathname, "/login") ? "page" : undefined}>
              Log in
            </Link>
          )}

          <button
            type="button"
            className="menu-btn"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpenOn(open ? null : pathname)}
          >
            {open ? <CloseMark /> : <MenuMark />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      {error && <p role="alert" className="wrap tile">{error}</p>}
      {open ? (
        <div
          id="site-menu"
          className="mobile-menu"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpenOn(null);
          }}
        >
          <nav className="wrap" aria-label="Menu">
            <ul>
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="mobile-menu-link"
                    aria-current={isActive(pathname, link.href) ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="label mt-8">Cities</p>
            <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
              {destinations.map((place) => (
                <li key={place.slug}>
                  <Link
                    href={`/destinations/${place.slug}`}
                    className="block py-1.5 text-[15px] text-muted transition-colors hover:text-fg"
                  >
                    {place.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-10 grid gap-3">
              <Link href="/plan" className="btn btn-primary btn-lg btn-block">
                Plan a trip
              </Link>
              {signedIn ? (
                <button
                  type="button"
                  className="btn btn-quiet btn-lg btn-block"
                  onClick={() => {
                    setOpenOn(null);
                    void signOut();
                  }}
                >
                  Log out
                </button>
              ) : (
                <Link href={loginHref} className="btn btn-quiet btn-lg btn-block">
                  Log in
                </Link>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function MenuMark() {
  return (
    <svg width="20" height="12" viewBox="0 0 20 12" aria-hidden="true">
      <path d="M1 1h18M1 11h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CloseMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
