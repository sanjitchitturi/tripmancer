import { NextResponse } from "next/server";
import { createSession, findOrCreateGoogleUser } from "@/server/accounts";
import { getDb } from "@/server/db";
import { exchangeGoogleCode, getGoogleConfig, verifyGoogleIdToken, verifyGoogleState } from "@/server/google";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/http";

const STATE_COOKIE = "tm_google_oauth";

function redirect(request: Request, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/api/auth/google/callback",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const config = getGoogleConfig(request);
  const state = verifyGoogleState(request.headers.get("cookie")?.match(/(?:^|; )tm_google_oauth=([^;]*)/)?.[1], url.searchParams.get("state"));
  const code = url.searchParams.get("code");
  if (!config || !state || !code || url.searchParams.has("error")) return redirect(request, "/login?error=google_cancelled");

  const token = await exchangeGoogleCode(config, code);
  const identity = token ? await verifyGoogleIdToken(token, config, state.nonce) : null;
  if (!identity) return redirect(request, "/login?error=google_failed");

  try {
    const db = await getDb();
    const result = await findOrCreateGoogleUser(db, identity);
    if (!result.ok) return redirect(request, "/login?error=google_account_exists");
    const session = await createSession(db, result.user.id);
    const response = redirect(request, state.returnPath);
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions(request, 60 * 60 * 24 * 30));
    return response;
  } catch {
    return redirect(request, "/login?error=google_failed");
  }
}
