"use client";

import { ShortlistButton } from "@/components/ShortlistButton";
import { useShortlist } from "@/components/useShortlist";

export function DestinationActions({ slug, name }: { slug: string; name: string }) {
  const { slugs, toggle } = useShortlist();
  return <ShortlistButton saved={slugs.includes(slug)} name={name} onToggle={() => toggle(slug)} />;
}
