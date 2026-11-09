import { handle, requireUser } from "@/server/http";
import { removeTrip } from "@/server/trips";

export async function DELETE(request: Request, context: RouteContext<"/api/trips/[id]">) {
  const { id } = await context.params;
  return handle(request, true, async ({ db, user }) => {
    const denied = requireUser(user);
    if (denied || !user) return denied ?? Response.json({ error: "Log in to continue." }, { status: 401 });
    await removeTrip(db, user.id, id);
    return Response.json({ ok: true });
  });
}
