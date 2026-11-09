import Link from "next/link";
import { Logo } from "@/components/Logo";

const links = [
  { href: "/company", label: "About" },
  { href: "/company#estimates", label: "How estimates work" },
  { href: "/privacy", label: "Privacy & data" },
  { href: "/credits", label: "Photo credits" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer no-print">
      <div className="wrap">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-[40ch] text-[15px] leading-6 text-muted">
              Day-by-day trips with a typical cost in US dollars, before you open a booking site.
            </p>
          </div>
          <nav className="footer-nav" aria-label="Footer">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-[13px] text-subtle sm:flex-row sm:justify-between">
          <p>© 2026 TripMancer</p>
          <p>Prices are typical estimates, not live fares.</p>
        </div>
      </div>
    </footer>
  );
}
