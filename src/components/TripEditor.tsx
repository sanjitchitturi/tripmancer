"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { PlanWorkspace } from "@/components/plan/PlanWorkspace";
import { copy } from "@/content/copy";
import { getServerTripStore, getTripStore, subscribeStore } from "@/lib/storage";

export function TripEditor() {
  const params = useParams<{ id: string }>();
  const store = useSyncExternalStore(subscribeStore, getTripStore, getServerTripStore);
  const trip = store.trips.find((item) => item.id === params.id) ?? null;

  if (!store.ready) return <div className="min-h-[70vh]" />;
  if (!trip) {
    return (
      <div className="wrap page">
        <div className="mx-auto max-w-md text-center">
          <p className="eyebrow">Saved trips</p>
          <h1 className="title mt-3">Trip not found</h1>
          <p className="mt-4 leading-7 text-muted">{copy.tripMissing}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/plan" className="btn btn-primary">
              {copy.plan}
            </Link>
            <Link href="/trips" className="btn btn-quiet">
              All trips
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PlanWorkspace
      initial={trip.input}
      initialReadiness={trip.readiness}
      savedId={trip.id}
      initialQuery=""
    />
  );
}
