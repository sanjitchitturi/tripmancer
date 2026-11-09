import { mkdirSync } from "node:fs";
import path from "node:path";

export interface Db {
  query<T>(text: string, params?: unknown[]): Promise<T[]>;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_hash text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider text NOT NULL DEFAULT 'password'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_subject text`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_google_subject_unique
    ON users (google_subject) WHERE google_subject IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`,
  `CREATE TABLE IF NOT EXISTS trips (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    saved_at timestamptz NOT NULL,
    input jsonb NOT NULL,
    readiness jsonb NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS trips_user_idx ON trips (user_id, saved_at DESC)`,
  `CREATE TABLE IF NOT EXISTS shortlist_items (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug text NOT NULL,
    position integer NOT NULL,
    PRIMARY KEY (user_id, slug)
  )`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    email text NOT NULL,
    attempted_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS login_attempts_email_idx ON login_attempts (email, attempted_at)`,
  // App queries use the table owner. Deny direct row access to public API roles.
  ...["users", "sessions", "trips", "shortlist_items", "login_attempts"].map(
    (table) => `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`,
  ),
];

interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
}

function adapt(client: Queryable): Db {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const result = await client.query(text, params);
      return result.rows as T[];
    },
  };
}

export async function ensureSchema(db: Db) {
  for (const statement of SCHEMA) {
    await db.query(statement);
  }
}

export async function createMemoryDb(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const client = await PGlite.create();
  const db = adapt(client);
  await ensureSchema(db);
  return db;
}

async function openEmbedded(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dir, { recursive: true });
  const client = await PGlite.create(dir);
  return adapt(client);
}

export function isLoopbackDatabase(url: string): boolean {
  const parsed = new URL(url);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("Unsupported database protocol");
  return ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
}

async function openPostgres(url: string): Promise<Db> {
  const postgres = (await import("postgres")).default;
  const local = isLoopbackDatabase(url);
  const sql = postgres(url, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: local ? false : { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT?.replaceAll("\\n", "\n") },
  });
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const rows = await sql.unsafe(text, params as never[]);
      return [...rows] as T[];
    },
  };
}

interface DbCache {
  db?: Promise<Db>;
  schema?: Promise<void>;
}

const globalCache = globalThis as typeof globalThis & { __tripmancerDb?: DbCache };

function cache(): DbCache {
  globalCache.__tripmancerDb ??= {};
  return globalCache.__tripmancerDb;
}

export function databaseMode(): "postgres" | "embedded" {
  return configuredDatabaseUrl() ? "postgres" : "embedded";
}

function configuredDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) return "";
  const unquoted = value.replace(/^['"]|['"]$/g, "").trim();
  const uri = unquoted.match(/(?:postgres(?:ql)?:\/\/)[^\s'"`]+/i)?.[0];
  return uri ?? unquoted;
}

export async function getDb(): Promise<Db> {
  const stored = cache();
  if (!stored.db) {
    stored.db = (async () => {
      const databaseUrl = configuredDatabaseUrl();
      if (databaseUrl) return openPostgres(databaseUrl);
      if (process.env.VERCEL) throw new Error("DATABASE_URL is not set");
      return openEmbedded();
    })().catch((error: unknown) => {
      stored.db = undefined;
      throw error;
    });
  }
  const db = await stored.db;
  stored.schema ??= ensureSchema(db).catch((error: unknown) => {
    stored.schema = undefined;
    throw error;
  });
  await stored.schema;
  return db;
}
