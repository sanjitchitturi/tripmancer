import { describe, expect, it } from "vitest";
import { emptyInput, emptyReadiness } from "@/lib/defaults";
import { authenticate, register, createSession, hashToken, findOrCreateGoogleUser, findUserByTokenHash, issueRecoveryKey, resetWithKey } from "@/server/accounts";
import { createMemoryDb } from "@/server/db";
import { listShortlist, replaceShortlist } from "@/server/shortlist";
import { listTrips, saveTrip } from "@/server/trips";
import { eraseAccount, exportAccountData } from "@/server/privacy";

const trip = {
  id: "11111111-1111-4111-8111-111111111111",
  savedAt: "2026-11-01T00:00:00.000Z",
  input: { ...emptyInput(), destinationSlug: "lisbon", start: "2026-11-01", end: "2026-11-05" },
  readiness: emptyReadiness(),
};

describe("account database", () => {
  it("keeps a password, then keeps trips and the shortlist on that account only", async () => {
    const db = await createMemoryDb();
    const created = await register(db, { name: "Ada Lovelace", email: "Ada@Example.com", password: "password1" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.user.email).toBe("ada@example.com");

    const duplicate = await register(db, { name: "Ada Lovelace", email: "ada@example.com", password: "password1" });
    expect(duplicate.ok).toBe(false);

    const wrong = await authenticate(db, "ada@example.com", "not-the-password");
    expect(wrong.ok).toBe(false);

    const signedIn = await authenticate(db, "ada@example.com", "password1");
    expect(signedIn.ok).toBe(true);
    if (!signedIn.ok) return;

    expect((await saveTrip(db, signedIn.user.id, trip)).ok).toBe(true);
    expect((await replaceShortlist(db, signedIn.user.id, ["lisbon", "lisbon", "nope"])).ok).toBe(true);

    const other = await register(db, { name: "Grace Hopper", email: "grace@example.com", password: "password2" });
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    expect(await listTrips(db, other.user.id)).toEqual([]);
    expect(await listShortlist(db, other.user.id)).toEqual([]);
    expect((await saveTrip(db, other.user.id, trip)).ok).toBe(false);

    const own = await listTrips(db, signedIn.user.id);
    expect(own).toHaveLength(1);
    expect(own[0]?.input.destinationSlug).toBe("lisbon");
    expect(await listShortlist(db, signedIn.user.id)).toEqual(["lisbon"]);
  }, 20000);
});

it("replaces recovery keys, consumes one once and revokes existing sessions", async () => {
  const db = await createMemoryDb();
  const signup = await register(db, { name: "Traveler", email: "recovery@example.test", password: "first-password" });
  if (!signup.ok) throw new Error(signup.error);
  const { user } = signup;
  const session = await createSession(db, user.id);
  expect((await issueRecoveryKey(db, user, "wrong-password")).ok).toBe(false);
  const old = await issueRecoveryKey(db, user, "first-password");
  const current = await issueRecoveryKey(db, user, "first-password");
  if (!old.ok || !current.ok) throw new Error("Expected recovery keys");
  expect((await resetWithKey(db, user.email, old.key, "second-password")).ok).toBe(false);
  expect((await resetWithKey(db, user.email, current.key, "second-password")).ok).toBe(true);
  expect(await findUserByTokenHash(db, hashToken(session))).toBeNull();
  expect((await resetWithKey(db, user.email, current.key, "third-password")).ok).toBe(false);
  expect((await authenticate(db, user.email, "first-password")).ok).toBe(false);
  expect((await authenticate(db, user.email, "second-password")).ok).toBe(true);
}, 20000);

it("exports only the account's data and erases account records after password confirmation", async () => {
  const db = await createMemoryDb();
  const created = await register(db, { name: "Private Traveler", email: "private@example.test", password: "private-password" });
  if (!created.ok) throw new Error(created.error);
  await saveTrip(db, created.user.id, trip);
  await replaceShortlist(db, created.user.id, ["lisbon"]);

  const exported = await exportAccountData(db, created.user);
  expect(exported.account.email).toBe("private@example.test");
  expect(exported.account.provider).toBe("password");
  expect(exported.trips).toHaveLength(1);
  expect(exported.shortlist).toEqual(["lisbon"]);
  expect(await eraseAccount(db, created.user, "wrong-password")).toBe(false);
  expect(await eraseAccount(db, created.user, "private-password")).toBe(true);
  expect(await listTrips(db, created.user.id)).toEqual([]);
  expect(await listShortlist(db, created.user.id)).toEqual([]);
  expect((await authenticate(db, created.user.email, "private-password")).ok).toBe(false);
}, 20000);

it("keeps Google identities separate from password accounts and allows an explicit deletion confirmation", async () => {
  const db = await createMemoryDb();
  const google = await findOrCreateGoogleUser(db, {
    subject: "google-subject-123",
    email: "google@example.test",
    name: "Google Traveler",
  });
  if (!google.ok) throw new Error(google.error);
  expect(google.user.provider).toBe("google");
  expect((await authenticate(db, google.user.email, "not-a-password")).ok).toBe(false);

  const repeated = await findOrCreateGoogleUser(db, {
    subject: "google-subject-123",
    email: "google@example.test",
    name: "Changed Name",
  });
  expect(repeated.ok).toBe(true);
  if (repeated.ok) expect(repeated.user.id).toBe(google.user.id);

  const passwordUser = await register(db, { name: "Password Traveler", email: "existing@example.test", password: "password1" });
  expect(passwordUser.ok).toBe(true);
  const conflict = await findOrCreateGoogleUser(db, {
    subject: "different-google-subject",
    email: "existing@example.test",
    name: "Password Traveler",
  });
  expect(conflict.ok).toBe(false);
  expect(await eraseAccount(db, google.user, "", "no")).toBe(false);
  expect(await eraseAccount(db, google.user, "", "DELETE")).toBe(true);
}, 20000);
