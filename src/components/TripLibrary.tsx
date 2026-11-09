"use client";

import Link from "next/link";
import { PlaceImage } from "@/components/PlaceImage";
import { importDeviceSaves, readLocalTrips, readLocalShortlist } from "@/lib/sync";
import { useState, useSyncExternalStore } from "react";
import { copy, countdownLabel } from "@/content/copy";
import { getDestination, getOrigin } from "@/data/destinations";
import { daysUntil, formatRange } from "@/lib/format";
import { buildPlan } from "@/lib/planner";
import { packingList, readinessSummary } from "@/lib/prep";
import { useAccount } from "@/components/useAccount";
import { deleteTrip, getServerTripStore, getTripStore, subscribeStore, upsertTrip } from "@/lib/storage";

export function TripLibrary() {
  const account = useAccount();
  const [message, setMessage] = useState("");
  const store = useSyncExternalStore(subscribeStore, getTripStore, getServerTripStore);
  const trips = store.trips;

  if (!account.ready || !store.ready) return <div className="min-h-[70vh]" />;
  return (
    <div className="wrap page">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">{account.session ? "Your account" : "On this device"}</p>
        <h1 className="display mt-3">Saved trips</h1>
        {account.session?.provider === "password" && <Link className="chip mt-3" href="/recovery">Manage recovery key</Link>}
        {account.session && (readLocalTrips().length > 0 || readLocalShortlist().length > 0) && (
          <button type="button" className="btn btn-quiet mt-3" onClick={async () => {
            try { await importDeviceSaves(); setMessage("Device saves moved to your account."); }
            catch (error) { setMessage(error instanceof Error ? error.message : "Import failed. Try again."); }
          }}>Import this device’s saved trips and places</button>
        )}
        {message && <p role="status">{message}</p>}
        {trips.length === 0 ? (
          <div className="card mt-8 p-8">
            <p className="text-muted">{copy.noTrips}</p>
            <Link href="/plan" className="btn btn-primary mt-5">
              {copy.plan}
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4">
            {trips.map((trip) => {
              const place = getDestination(trip.input.destinationSlug);
              const origin = getOrigin(trip.input.originId);
              const border = Boolean(place && origin.country !== place.country);
              const days = place ? buildPlan(trip.input, place).days : [];
              const packing = place ? packingList(place, Number(trip.input.start?.slice(5, 7)) || null,
                days.flatMap((day) => day.activities.map((item) => item.activity)), border) : [];
              const summary = readinessSummary(packing, trip.readiness, border);
              const left = summary.total - summary.done;
              return (
                <li key={trip.id} className="card overflow-hidden">
                  <div className="grid sm:grid-cols-[168px_minmax(0,1fr)]">
                    {place ? (
                      <div className="media h-36 rounded-none sm:h-full sm:min-h-36">
                        <PlaceImage src={place.photo} alt={place.photoAlt} position={place.photoPosition} sizes="168px" />
                      </div>
                    ) : null}
                    <div className="p-5 sm:p-6">
                      <p className="text-[22px] font-semibold tracking-[-0.02em]">{place?.name ?? "Trip"}</p>
                      {trip.input.start && trip.input.end ? (
                        <p className="mt-1 text-muted">{formatRange(trip.input.start, trip.input.end)}</p>
                      ) : null}
                      {trip.input.start ? <p className="label mt-1">{countdownLabel(daysUntil(trip.input.start))}</p> : null}
                      <p className="mt-2 text-[15px] text-muted">
                        {trip.input.travelers} travelers · Saved {new Date(trip.savedAt).toLocaleDateString()} · {left === 0 ? "Ready to go" : `${left} of ${summary.total} still open`}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Link href={`/trips/${trip.id}`} className="btn btn-primary btn-sm">
                          Open
                        </Link>
                        <button
                          type="button"
                          className="btn btn-quiet btn-sm"
                          onClick={() => {
                            upsertTrip({
                              ...trip,
                              id: crypto.randomUUID(),
                              savedAt: new Date().toISOString(),
                            });
                          }}
                        >
                          {copy.duplicate}
                        </button>
                        <button
                          type="button"
                          className="btn btn-quiet btn-sm"
                          onClick={() => {
                            if (window.confirm("Delete this saved trip?")) void deleteTrip(trip.id).catch(() => setMessage("Could not remove this trip. Try again."));
                          }}
                        >
                          {copy.remove}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
