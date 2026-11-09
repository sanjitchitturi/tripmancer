import { issueRecoveryKey, resetWithKey } from "@/server/accounts";
import { handle, readJson, requireUser } from "@/server/http";

export async function POST(request: Request) {
  return handle(request, true, async ({ db, user }) => {
    const body = await readJson(request);
    if (!body || typeof body !== "object" || !("password" in body) || typeof body.password !== "string") {
      return Response.json({ error: "Enter a password." }, { status: 400 });
    }
    if ("key" in body) {
      const result = await resetWithKey(db, "email" in body && typeof body.email === "string" ? body.email : "",
        typeof body.key === "string" ? body.key : "", body.password);
      return Response.json(result.ok ? { ok: true } : { error: result.error }, { status: result.ok ? 200 : result.status });
    }
    if (!user) return requireUser(user)!;
    const result = await issueRecoveryKey(db, user, body.password);
    return Response.json(result.ok ? { key: result.key } : { error: result.error },
      { status: result.ok ? 200 : result.status, headers: { "Cache-Control": "private, no-store" } });
  });
}
