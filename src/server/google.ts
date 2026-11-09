import { randomBytes, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { cleanEmail, cleanName, safeReturnPath } from "@/lib/identity";

const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleIdentity {
  subject: string;
  email: string;
  name: string;
}

function configuredOrigin(request: Request) {
  const raw = process.env.APP_ORIGIN?.trim() || new URL(request.url).origin;
  try {
    const url = new URL(raw);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) return null;
    if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getGoogleConfig(request: Request): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  const origin = configuredOrigin(request);
  if (!clientId || !clientSecret || !origin || /[\r\n]/.test(clientId + clientSecret)) return null;
  return { clientId, clientSecret, redirectUri: `${origin}/api/auth/google/callback` };
}

export function googleState() {
  return { state: randomBytes(32).toString("base64url"), nonce: randomBytes(32).toString("base64url") };
}

export function googleStateCookie(state: string, nonce: string, returnPath = "/trips") {
  return `${state}.${nonce}.${Buffer.from(safeReturnPath(returnPath)).toString("base64url")}`;
}

export function verifyGoogleState(cookie: string | undefined, state: string | null) {
  if (!cookie || !state) return null;
  const parts = cookie.split(".");
  if (parts.length !== 3 || !/^[A-Za-z0-9_-]{43}$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1]) || !/^[A-Za-z0-9_-]{1,512}$/.test(parts[2])) return null;
  const expected = Buffer.from(parts[0]);
  const received = Buffer.from(state);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    return { nonce: parts[1], returnPath: safeReturnPath(Buffer.from(parts[2], "base64url").toString("utf8")) };
  } catch {
    return null;
  }
}

export function googleAuthorizationUrl(config: GoogleConfig, state: string, nonce: string) {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    prompt: "select_account",
  }).toString();
  return url;
}

export async function exchangeGoogleCode(config: GoogleConfig, code: string) {
  if (code.length > 2048 || /[\u0000-\u001f]/.test(code)) return null;
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null) as { id_token?: unknown } | null;
  return typeof data?.id_token === "string" && data.id_token.length <= 8192 ? data.id_token : null;
}

export async function verifyGoogleIdToken(idToken: string, config: GoogleConfig, nonce: string): Promise<GoogleIdentity | null> {
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: config.clientId,
    });
    const subject = typeof payload.sub === "string" && payload.sub.length > 0 && payload.sub.length <= 255 ? payload.sub : null;
    const email = typeof payload.email === "string" ? cleanEmail(payload.email) : null;
    const name = typeof payload.name === "string" ? cleanName(payload.name) : null;
    if (!subject || !email || payload.email_verified !== true || payload.nonce !== nonce) return null;
    return { subject, email, name: name ?? "Traveler" };
  } catch {
    return null;
  }
}
