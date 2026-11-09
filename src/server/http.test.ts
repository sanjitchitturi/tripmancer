import { afterEach, describe, expect, it, vi } from "vitest";
import { crossSite, readJson, secureCookie } from "./http";
import { isLoopbackDatabase } from "./db";
afterEach(() => vi.unstubAllEnvs());
describe("request boundaries", () => {
  it("rejects cross-origin writes even with spoofed forwarding headers", () => {
    expect(crossSite(new Request("https://app.example/api", {headers: {origin:"https://evil.example", "x-forwarded-host":"evil.example"}}))).toBe(true);
    expect(crossSite(new Request("https://app.example/api", {headers: {origin:"http://app.example"}}))).toBe(true);
  });
  it("accepts only the deployment origin on Vercel previews", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "preview.example");
    vi.stubEnv("APP_ORIGIN", "https://production.example");
    expect(crossSite(new Request("https://internal/api", {headers: {origin: "https://preview.example"}}))).toBe(false);
    expect(crossSite(new Request("https://internal/api", {headers: {origin: "https://production.example"}}))).toBe(true);
  });
  it("bounds bodies without trusting content-length", async () => {
    expect(await readJson(new Request("https://example.com", {method:"POST", body:JSON.stringify({text:"x".repeat(200001)}), headers:{"content-length":"1"}}))).toBeNull();
    expect(await readJson(new Request("https://example.com", {method:"POST", body:'{"ok":true}'}))).toEqual({ok:true});
  });
  it("keeps production cookies secure", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(secureCookie(new Request("http://internal", {headers:{"x-forwarded-proto":"http"}}))).toBe(true);
  });
  it("checks the database hostname, not credentials or a substring", () => {
    expect(isLoopbackDatabase("postgres://u:localhost@db.example/app")).toBe(false);
    expect(isLoopbackDatabase("postgres://localhost.evil.example/app")).toBe(false);
    expect(isLoopbackDatabase("postgres://127.0.0.1/app")).toBe(true);
  });
});
