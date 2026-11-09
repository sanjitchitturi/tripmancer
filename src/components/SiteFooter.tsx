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
          <Logo />
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
        </div>
      </div>
    </footer>
  );
}
