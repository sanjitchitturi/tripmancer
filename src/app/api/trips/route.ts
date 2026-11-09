import { handle, readJson, requireUser } from "@/server/http";
import { listTrips, saveTrip } from "@/server/trips";

export async function GET(request: Request) {
  return handle(request, false, async ({ db, user }) => {
    const denied = requireUser(user);
    if (denied || !user) return denied ?? Response.json({ error: "Log in to continue." }, { status: 401 });
    return Response.json({ trips: await listTrips(db, user.id) });
  });
}

export async function PUT(request: Request) {
  return handle(request, true, async ({ db, user }) => {
    const denied = requireUser(user);
    if (denied || !user) return denied ?? Response.json({ error: "Log in to continue." }, { status: 401 });
    const result = await saveTrip(db, user.id, await readJson(request));
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ ok: true });
  });
}
