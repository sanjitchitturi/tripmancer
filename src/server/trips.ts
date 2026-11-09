import { getDestination } from "@/data/destinations";
import { emptyReadiness } from "@/lib/defaults";
import { sanitizeInput } from "@/lib/share";
import type { Readiness, SavedTrip } from "@/lib/types";
import type { Db } from "@/server/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TRIPS = 100;

interface TripRow {
  id: string;
  saved_at: string | Date;
  input: unknown;
  readiness: unknown;
}

function asObject(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  return value;
}

function asIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return new Date().toISOString();
}

export function sanitizeReadiness(value: unknown): Readiness {
  const raw = value && typeof value === "object" ? (value as Partial<Readiness>) : {};
  const packing: Record<string, boolean> = {};
  if (raw.packing && typeof raw.packing === "object") {
    for (const [key, item] of Object.entries(raw.packing).slice(0, 40)) {
      if (key.length > 0 && key.length <= 80) packing[key] = Boolean(item);
    }
  }
  return {
    flights: Boolean(raw.flights),
    stay: Boolean(raw.stay),
    visa: Boolean(raw.visa),
    packing,
  };
}

export function sanitizeTrip(value: unknown): SavedTrip | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<SavedTrip>;
  if (typeof raw.id !== "string" || !UUID.test(raw.id)) return null;
  const input = sanitizeInput(raw.input);
  if (!input?.destinationSlug || !getDestination(input.destinationSlug)) return null;
  if (input.start && !DATE.test(input.start)) return null;
  if (input.end && !DATE.test(input.end)) return null;
  return {
    id: raw.id.toLowerCase(),
    savedAt: asIso(raw.savedAt),
    input,
    readiness: raw.readiness ? sanitizeReadiness(raw.readiness) : emptyReadiness(),
  };
}

function fromRow(row: TripRow): SavedTrip | null {
  return sanitizeTrip({
    id: row.id,
    savedAt: asIso(row.saved_at),
    input: asObject(row.input),
    readiness: asObject(row.readiness),
  });
}

export async function listTrips(db: Db, userId: string): Promise<SavedTrip[]> {
  const rows = await db.query<TripRow>(
    `SELECT id, saved_at, input, readiness FROM trips WHERE user_id = $1 ORDER BY saved_at DESC`,
    [userId],
  );
  return rows.flatMap((row) => {
    const trip = fromRow(row);
    return trip ? [trip] : [];
  });
}

export async function saveTrip(db: Db, userId: string, value: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const trip = sanitizeTrip(value);
  if (!trip) return { ok: false, error: "That trip could not be saved." };

  const existing = await db.query<{ user_id: string }>(`SELECT user_id FROM trips WHERE id = $1`, [trip.id]);
  if (existing[0] && existing[0].user_id !== userId) return { ok: false, error: "That trip could not be saved." };
  if (!existing[0]) {
    const counts = await db.query<{ count: number | string }>(
      `SELECT count(*)::int AS count FROM trips WHERE user_id = $1`,
      [userId],
    );
    if (Number(counts[0]?.count ?? 0) >= MAX_TRIPS) return { ok: false, error: "The account already has 100 trips." };
  }

  await db.query(
    `INSERT INTO trips (id, user_id, saved_at, input, readiness)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
     ON CONFLICT (id) DO UPDATE
     SET saved_at = EXCLUDED.saved_at, input = EXCLUDED.input, readiness = EXCLUDED.readiness
     WHERE trips.user_id = EXCLUDED.user_id`,
    [trip.id, userId, trip.savedAt, JSON.stringify(trip.input), JSON.stringify(trip.readiness)],
  );
  return { ok: true };
}

export async function removeTrip(db: Db, userId: string, id: string) {
  if (!UUID.test(id)) return;
  await db.query(`DELETE FROM trips WHERE id = $1 AND user_id = $2`, [id.toLowerCase(), userId]);
}
