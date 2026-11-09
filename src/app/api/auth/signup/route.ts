import { createSession, register } from "@/server/accounts";
import { handle, readJson, setSessionCookie } from "@/server/http";

export async function POST(request: Request) {
  return handle(request, true, async ({ db }) => {
    const body = await readJson(request);
    const record = body && typeof body === "object" ? (body as { name?: unknown; email?: unknown; password?: unknown }) : {};
    const result = await register(db, {
      name: typeof record.name === "string" ? record.name : "",
      email: typeof record.email === "string" ? record.email : "",
      password: typeof record.password === "string" ? record.password : "",
    });
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    const token = await createSession(db, result.user.id);
    await setSessionCookie(request, token);
    return Response.json({ user: { email: result.user.email, name: result.user.name, provider: result.user.provider } });
  });
}
