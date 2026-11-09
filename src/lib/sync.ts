import { sanitizeInput } from "@/lib/share";
import type { SavedTrip } from "@/lib/types";

export interface Session {
  email: string;
  name: string;
  provider: "password" | "google";
}

export interface RemoteState {
  ready: boolean;
  session: Session | null;
  trips: SavedTrip[];
  shortlist: string[];
}

const TRIPS = "tripmancer.trips";
const SHORTLIST = "tripmancer.shortlist";

const serverState: RemoteState = { ready: false, session: null, trips: [], shortlist: [] };
let state: RemoteState = serverState;
const listeners = new Set<() => void>();
let chain: Promise<unknown> = Promise.resolve();
let started = false;
let tripView: { state: RemoteState; store: TripStore } | null = null;
let shortlistView: { state: RemoteState; store: ShortlistStore } | null = null;

export interface TripStore {
  ready: boolean;
  trips: SavedTrip[];
}

export interface ShortlistStore {
  ready: boolean;
  slugs: string[];
}

const serverTrips: TripStore = { ready: false, trips: [] };
const serverShortlist: ShortlistStore = { ready: false, slugs: [] };

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function commit(next: RemoteState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function getRemote() {
  return state;
}

export function subscribeRemote(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getServerTripStore() {
  return serverTrips;
}

export function getServerShortlist() {
  return serverShortlist;
}

export function getTripStore(): TripStore {
  if (typeof window === "undefined") return serverTrips;
  if (!state.ready) return serverTrips;
  if (tripView?.state === state) return tripView.store;
  const store = { ready: true, trips: state.trips };
  tripView = { state, store };
  return store;
}

export function getShortlistStore(): ShortlistStore {
  if (typeof window === "undefined") return serverShortlist;
  if (!state.ready) return serverShortlist;
  if (shortlistView?.state === state) return shortlistView.store;
  const store = { ready: true, slugs: state.shortlist };
  shortlistView = { state, store };
  return store;
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readLocalTrips(): SavedTrip[] {
  const parsed = readJson(TRIPS);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Partial<SavedTrip>;
    const input = sanitizeInput(record.input);
    if (!input || typeof record.id !== "string") return [];
    const readiness = record.readiness;
    return [
      {
        id: record.id,
        savedAt: typeof record.savedAt === "string" ? record.savedAt : new Date().toISOString(),
        input,
        readiness: {
          flights: Boolean(readiness?.flights),
          stay: Boolean(readiness?.stay),
          visa: Boolean(readiness?.visa),
          packing: readiness?.packing && typeof readiness.packing === "object" ? readiness.packing : {},
        },
      },
    ];
  });
}

function writeLocalTrips(trips: SavedTrip[]) {
  localStorage.setItem(TRIPS, JSON.stringify(trips));
}

export function readLocalShortlist(): string[] {
  const parsed = readJson(SHORTLIST);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
}

function writeLocalShortlist(slugs: string[]) {
  localStorage.setItem(SHORTLIST, JSON.stringify(slugs));
}

function clearLegacyAccounts() {
  localStorage.removeItem("tripmancer.users");
  localStorage.removeItem("tripmancer.session");
  localStorage.removeItem("tripmancer.codes");
}

async function errorMessage(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

async function putTrip(trip: SavedTrip) {
  return fetch("/api/trips", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(trip),
  });
}

async function uploadLocalTrips() {
  const local = readLocalTrips();
  if (local.length === 0) return;
  const remain: SavedTrip[] = [];
  for (const trip of local) {
    const response = await putTrip(trip);
    if (!response.ok) remain.push(trip);
  }
  if (remain.length > 0) writeLocalTrips(remain);
  else localStorage.removeItem(TRIPS);
}

async function fetchTrips() {
  const response = await fetch("/api/trips");
  if (!response.ok) throw new Error("trips");
  const data = (await response.json()) as { trips?: SavedTrip[] };
  return Array.isArray(data.trips) ? data.trips : [];
}

async function fetchShortlist() {
  const response = await fetch("/api/shortlist");
  if (!response.ok) throw new Error("shortlist");
  const data = (await response.json()) as { slugs?: string[] };
  return Array.isArray(data.slugs) ? data.slugs.filter((item): item is string => typeof item === "string") : [];
}

async function loadAccount(session: Session) {
  const [trips, shortlist] = await Promise.all([fetchTrips(), fetchShortlist()]);
  commit({ ready: true, session, trips, shortlist });
}

export function importDeviceSaves() {
  return enqueue(async () => {
    if (!state.session) throw new Error("Sign in to import saves.");
    const session = state.session;
    await uploadLocalTrips();
    const local = readLocalShortlist();
    if (local.length) {
      const merged = [...new Set([...await fetchShortlist(), ...local])];
      if (merged.length > 50) throw new Error("Make space in your shortlist first.");
      const response = await fetch("/api/shortlist", {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ slugs: merged }),
      });
      if (!response.ok) throw new Error("Could not import the shortlist.");
      localStorage.removeItem(SHORTLIST);
    }
    await loadAccount(session);
    if (readLocalTrips().length) throw new Error("Some trips could not be imported. Their device copies are available when signed out.");
  });
}

async function refreshBody() {
  clearLegacyAccounts();
  try {
    const response = await fetch("/api/auth/session");
    if (!response.ok) throw new Error("session");
    const data = (await response.json()) as { user?: Session | null };
    const session: Session | null = data.user?.email && data.user.name
      ? { email: data.user.email, name: data.user.name, provider: data.user.provider === "google" ? "google" : "password" }
      : null;
    if (!session) {
      commit({ ready: true, session: null, trips: readLocalTrips(), shortlist: readLocalShortlist() });
      return;
    }
    await loadAccount(session);
  } catch {
    commit({ ready: true, session: null, trips: readLocalTrips(), shortlist: readLocalShortlist() });
  }
}

export function clearDeviceSaves() {
  return enqueue(async () => {
    for (const key of [TRIPS, SHORTLIST, "tripmancer.shortlist.merged", "tripmancer.trial"]) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
    commit(state.session ? { ...state } : { ...state, trips: [], shortlist: [] });
  });
}

export function startSync() {
  if (typeof window === "undefined" || started) return;
  started = true;
  void enqueue(() => refreshBody());
}

export function connectSession(session: Session) {
  return enqueue(() => loadAccount(session));
}

export function logoutRemote() {
  return enqueue(async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) throw new Error("Could not log out.");
    commit({ ready: true, session: null, trips: readLocalTrips(), shortlist: readLocalShortlist() });
  });
}

export function upsertTrip(trip: SavedTrip): Promise<string | null> {
  return enqueue(async () => {
    const current = state;
    const trips = [trip, ...current.trips.filter((item) => item.id !== trip.id)];
    if (!current.session) {
      writeLocalTrips(trips);
      commit({ ...current, ready: true, trips });
      return null;
    }
    const response = await putTrip(trip);
    if (response.ok) { commit({ ...current, trips }); return null; }
    const message = await errorMessage(response, "Could not save the trip.");
    const tripsNow = await fetchTrips().catch(() => state.trips);
    commit({ ...state, trips: tripsNow });
    return message;
  });
}

export function deleteTrip(id: string) {
  return enqueue(async () => {
    const current = state;
    const trips = current.trips.filter((item) => item.id !== id);
    if (!current.session) {
      writeLocalTrips(trips);
      commit({ ...current, ready: true, trips });
      return;
    }
    const response = await fetch(`/api/trips/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Could not remove trip.");
    commit({ ...current, trips });
  });
}

export function saveShortlist(slugs: string[]) {
  return enqueue(async () => {
    const current = state;
    const next = [...new Set(slugs)].slice(0, 50);
    if (!current.session) {
      writeLocalShortlist(next);
      commit({ ...current, ready: true, shortlist: next });
      return;
    }
    commit({ ...current, shortlist: next });
    const response = await fetch("/api/shortlist", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slugs: next }),
    });
    if (!response.ok) {
      const shortlist = await fetchShortlist().catch(() => state.shortlist);
      commit({ ...state, shortlist });
    }
  });
}
