import { createHash, randomBytes } from "node:crypto";
import { cleanEmail, cleanName, passwordIssue } from "@/lib/identity";
import type { Db } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/passwords";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  provider: "password" | "google";
}

export type AuthResult = { ok: true; user: PublicUser } | { ok: false; error: string; status: number };

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  auth_provider: string;
}

function asPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    provider: row.auth_provider === "google" ? "google" : "password",
  };
}

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
let dummyHash: Promise<string> | null = null;

function placeholderHash() {
  dummyHash ??= hashPassword("placeholder-password");
  return dummyHash;
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function register(
  db: Db,
  input: { name: string; email: string; password: string },
): Promise<AuthResult> {
  const name = cleanName(input.name);
  const email = cleanEmail(input.email);
  const issue = passwordIssue(input.password);
  if (!name) return { ok: false, error: "Add your name.", status: 400 };
  if (!email) return { ok: false, error: "Use a real email.", status: 400 };
  if (issue) return { ok: false, error: issue, status: 400 };
  if (await tooManyAttempts(db, email)) {
    return { ok: false, error: "Too many attempts. Try again in a few minutes.", status: 429 };
  }

  const passwordHash = await hashPassword(input.password);
  const id = crypto.randomUUID();
  try {
    await db.query(`INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)`, [
      id,
      email,
      name,
      passwordHash,
    ]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      await db.query(`INSERT INTO login_attempts (email) VALUES ($1)`, [email]);
      return { ok: false, error: "That email already has an account.", status: 409 };
    }
    throw error;
  }
  return { ok: true, user: { id, email, name, provider: "password" } };
}

async function tooManyAttempts(db: Db, email: string) {
  await db.query(`DELETE FROM login_attempts WHERE attempted_at < now() - interval '1 day'`);
  await db.query(`DELETE FROM sessions WHERE expires_at < now()`);
  const rows = await db.query<{ count: number | string }>(
    `SELECT count(*)::int AS count FROM login_attempts WHERE email = $1 AND attempted_at > now() - interval '15 minutes'`,
    [email],
  );
  return Number(rows[0]?.count ?? 0) >= 8;
}

export async function authenticate(db: Db, emailInput: string, password: string): Promise<AuthResult> {
  const email = cleanEmail(emailInput);
  if (!email) return { ok: false, error: "Use a real email.", status: 400 };
  if (password.length < 8 || password.length > 200) {
    return { ok: false, error: "Email or password does not match.", status: 401 };
  }
  if (await tooManyAttempts(db, email)) {
    return { ok: false, error: "Too many attempts. Try again in a few minutes.", status: 429 };
  }

  const rows = await db.query<UserRow>(`SELECT id, email, name, password_hash, auth_provider FROM users WHERE email = $1`, [email]);
  const user = rows[0] ?? null;
  const matches = await verifyPassword(
    password,
    user?.auth_provider === "password" ? user.password_hash : await placeholderHash(),
  );
  if (!user || user.auth_provider !== "password" || !matches) {
    await db.query(`INSERT INTO login_attempts (email) VALUES ($1)`, [email]);
    return { ok: false, error: "Email or password does not match.", status: 401 };
  }
  await db.query(`DELETE FROM login_attempts WHERE email = $1`, [email]);
  return { ok: true, user: asPublicUser(user) };
}

export async function findOrCreateGoogleUser(
  db: Db,
  input: { subject: string; email: string; name: string },
): Promise<AuthResult> {
  const existing = await db.query<UserRow>(
    `SELECT id, email, name, password_hash, auth_provider FROM users WHERE google_subject = $1`,
    [input.subject],
  );
  if (existing[0]) return { ok: true, user: asPublicUser(existing[0]) };

  const emailOwner = await db.query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [input.email]);
  if (emailOwner[0]) {
    return { ok: false, error: "An account already uses this email. Sign in with its existing method.", status: 409 };
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(randomBytes(48).toString("base64url"));
  try {
    await db.query(
      `INSERT INTO users (id, email, name, password_hash, auth_provider, google_subject)
       VALUES ($1, $2, $3, $4, 'google', $5)`,
      [id, input.email, input.name, passwordHash, input.subject],
    );
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const matched = await db.query<UserRow>(
      `SELECT id, email, name, password_hash, auth_provider FROM users WHERE google_subject = $1`,
      [input.subject],
    );
    if (matched[0]) return { ok: true, user: asPublicUser(matched[0]) };
    return { ok: false, error: "An account already uses this email. Sign in with its existing method.", status: 409 };
  }
  return { ok: true, user: { id, email: input.email, name: input.name, provider: "google" } };
}

export async function createSession(db: Db, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_MS).toISOString();
  await db.query(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`, [
    hashToken(token),
    userId,
    expires,
  ]);
  return token;
}

export async function findUserByTokenHash(db: Db, tokenHash: string): Promise<PublicUser | null> {
  const rows = await db.query<UserRow>(
    `SELECT u.id, u.email, u.name, u.password_hash, u.auth_provider
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash],
  );
  return rows[0] ? asPublicUser(rows[0]) : null;
}

export async function deleteSession(db: Db, tokenHash: string) {
  await db.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
}

// The plaintext key is returned once. Possession of the key is sufficient to reset the account.
export async function issueRecoveryKey(db: Db, user: PublicUser, password: string) {
  const verified = await authenticate(db, user.email, password);
  if (!verified.ok) return verified;
  const key = randomBytes(32).toString("base64url");
  await db.query("UPDATE users SET recovery_hash = $1 WHERE id = $2", [hashToken(key), user.id]);
  return { ok: true as const, key };
}

export async function resetWithKey(db: Db, emailInput: string, key: string, password: string) {
  const email = cleanEmail(emailInput);
  const invalid = { ok: false as const, error: "The email and recovery key do not match.", status: 400 };
  const issue = passwordIssue(password);
  if (issue) return { ok: false as const, error: issue, status: 400 };
  if (!email || !/^[A-Za-z0-9_-]{43}$/.test(key)) return invalid;
  const digest = hashToken(key);
  const found = await db.query("SELECT id FROM users WHERE email = $1 AND recovery_hash = $2", [email, digest]);
  if (!found.length) return invalid;
  const hash = await hashPassword(password);
  const changed = await db.query(
    `WITH changed AS (
       UPDATE users SET password_hash = $3, recovery_hash = NULL
       WHERE email = $1 AND recovery_hash = $2 RETURNING id
     ), revoked AS (DELETE FROM sessions WHERE user_id IN (SELECT id FROM changed))
     SELECT id FROM changed`, [email, digest, hash]);
  return changed.length ? { ok: true as const } : invalid;
}
