import { afterEach, describe, expect, it, vi } from "vitest";
import { getGoogleConfig, googleAuthorizationUrl, googleStateCookie, verifyGoogleState } from "./google";

const config = {
  clientId: "client-id.apps.googleusercontent.com",
  clientSecret: "secret",
  redirectUri: "https://tripmancer.example/api/auth/google/callback",
};

afterEach(() => vi.unstubAllEnvs());

describe("Google OAuth request boundaries", () => {
  it("sends the required OpenID scopes and preserves only a safe return path", () => {
    const state = "a".repeat(43);
    const nonce = "b".repeat(43);
    const url = googleAuthorizationUrl(config, state, nonce);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    const cookie = googleStateCookie(state, nonce, "/plan?d=lisbon");
    expect(verifyGoogleState(cookie, state)).toEqual({ nonce, returnPath: "/plan?d=lisbon" });
    expect(verifyGoogleState(cookie, "c".repeat(43))).toBeNull();
  });

  it("does not allow an external return URL through the OAuth state cookie", () => {
    const cookie = googleStateCookie("a".repeat(43), "b".repeat(43), "https://outside.example");
    expect(verifyGoogleState(cookie, "a".repeat(43))?.returnPath).toBe("/plan");
  });

  it("only enables Google sign-in when credentials and a valid origin exist", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", config.clientId);
    vi.stubEnv("GOOGLE_CLIENT_SECRET", config.clientSecret);
    vi.stubEnv("APP_ORIGIN", "https://tripmancer.example");
    expect(getGoogleConfig(new Request("https://internal.example/api/auth/providers"))?.redirectUri)
      .toBe("https://tripmancer.example/api/auth/google/callback");
    vi.stubEnv("APP_ORIGIN", "http://app.example");
    expect(getGoogleConfig(new Request("https://internal.example/api/auth/providers"))).toBeNull();
  });
});
