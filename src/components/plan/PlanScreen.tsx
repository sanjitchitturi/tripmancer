"use client";

import { useSearchParams } from "next/navigation";
import { PlanWorkspace } from "@/components/plan/PlanWorkspace";
import { useAccount } from "@/components/useAccount";
import { emptyInput, emptyReadiness } from "@/lib/defaults";
import { decodePlan } from "@/lib/share";

export function PlanScreen() {
  const params = useSearchParams();
  const account = useAccount();
  const encoded = params.get("p");
  const dest = params.get("d");
  const decoded = encoded ? decodePlan(encoded) : null;
  if (!account.ready) return <p className="wrap page" role="status">Opening planner…</p>;

  if (encoded && !decoded) return <section className="wrap page"><h1 className="title">This trip link could not be opened</h1><p>Ask the traveler for a fresh link or <a className="editorial-link" href="/plan">start a trip</a>.</p></section>;
  const query = params.get("q") ?? "";
  const continued = !account.session && !decoded && !dest && !query ? account.trial.input : null;
  const initial = decoded ?? (dest ? { ...emptyInput(), destinationSlug: dest } : continued ?? emptyInput());

  return (
    <PlanWorkspace
      key={`${params.toString()}:${account.session?.email ?? "guest"}`}
      initial={initial}
      initialReadiness={emptyReadiness()}
      savedId={null}
      initialQuery={query}
    />
  );
}
