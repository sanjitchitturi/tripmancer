import { cookies } from "next/headers";
import { connection } from "next/server";
import { deleteSession, findUserByTokenHash, hashToken, type PublicUser } from "@/server/accounts";
import { getDb, type Db } from "@/server/db";

export const SESSION_COOKIE = "tm_session";

export function crossSite(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const previewHost = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL;
  const expected = previewHost ? `https://${previewHost}` : process.env.APP_ORIGIN ?? new URL(request.url).origin;
  try {
    return new URL(origin).origin !== new URL(expected).origin;
  } catch {
    return true;
  }
}

export async function readJson(request: Request): Promise<unknown> {
  const limit = 200_000;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export function secureCookie(request: Request) {
  return process.env.NODE_ENV === "production" || new URL(request.url).protocol === "https:";
}

export function sessionCookieOptions(request: Request, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookie(request),
    path: "/",
    maxAge,
  };
}

export async function setSessionCookie(request: Request, token: string) {
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(request, 60 * 60 * 24 * 30));
}

export async function clearSessionCookie(request: Request) {
  (await cookies()).set(SESSION_COOKIE, "", sessionCookieOptions(request, 0));
}

export async function currentUser(db: Db): Promise<PublicUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return findUserByTokenHash(db, hashToken(token));
}

export async function endSession(request: Request, db: Db) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(db, hashToken(token));
  await clearSessionCookie(request);
}

export async function handle(
  request: Request,
  write: boolean,
  run: (ctx: { db: Db; user: PublicUser | null }) => Promise<Response>,
) {
  await connection();
  if (write && crossSite(request)) {
    return Response.json({ error: "That request was blocked." }, { status: 403 });
  }
  try {
    const db = await getDb();
    const user = await currentUser(db);
    const response = await run({ db, user });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    console.error("Account request failed");
    const missing = error instanceof Error && error.message === "DATABASE_URL is not set";
    return Response.json(
      { error: missing ? "The account database is not configured yet." : "The account server is unavailable." },
      { status: 503 },
    );
  }
}

export function requireUser(user: PublicUser | null) {
  if (user) return null;
  return Response.json({ error: "Log in to continue." }, { status: 401 });
}
