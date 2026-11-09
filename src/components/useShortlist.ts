"use client";

import { useSyncExternalStore } from "react";
import { getServerShortlist, getShortlistStore, saveShortlist, subscribeStore } from "@/lib/storage";

export function useShortlist() {
  const store = useSyncExternalStore(subscribeStore, getShortlistStore, getServerShortlist);

  function toggle(slug: string) {
    const current = getShortlistStore().slugs;
    const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
    saveShortlist(next);
  }

  return { slugs: store.slugs, toggle };
}
