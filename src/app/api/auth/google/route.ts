import { NextResponse } from "next/server";
import { googleAuthorizationUrl, getGoogleConfig, googleState, googleStateCookie } from "@/server/google";
import { secureCookie } from "@/server/http";
import { safeReturnPath } from "@/lib/identity";

const STATE_COOKIE = "tm_google_oauth";

export async function GET(request: Request) {
  const config = getGoogleConfig(request);
  const fallback = new URL("/login?error=google_unavailable", request.url);
  if (!config) return NextResponse.redirect(fallback);

  const { state, nonce } = googleState();
  const returnPath = safeReturnPath(new URL(request.url).searchParams.get("next"));
  const response = NextResponse.redirect(googleAuthorizationUrl(config, state, nonce));
  response.cookies.set(STATE_COOKIE, googleStateCookie(state, nonce, returnPath), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(request),
    path: "/api/auth/google/callback",
    maxAge: 10 * 60,
  });
  return response;
}
