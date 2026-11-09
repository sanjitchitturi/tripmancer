import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountSync } from "@/components/AccountSync";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TripMancer",
    template: "%s · TripMancer",
  },
  description: "See the days and a typical cost in US dollars before you book the flight or the stay.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#fbfaf7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
        >
          Skip to content
        </a>
        <AccountSync />
        <Suspense fallback={<div className="h-16 border-b border-line" />}>
          <SiteHeader />
        </Suspense>
        <main id="content" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
