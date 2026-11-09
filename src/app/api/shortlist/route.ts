import { handle, readJson, requireUser } from "@/server/http";
import { listShortlist, replaceShortlist } from "@/server/shortlist";

export async function GET(request: Request) {
  return handle(request, false, async ({ db, user }) => {
    const denied = requireUser(user);
    if (denied || !user) return denied ?? Response.json({ error: "Log in to continue." }, { status: 401 });
    return Response.json({ slugs: await listShortlist(db, user.id) });
  });
}

export async function PUT(request: Request) {
  return handle(request, true, async ({ db, user }) => {
    const denied = requireUser(user);
    if (denied || !user) return denied ?? Response.json({ error: "Log in to continue." }, { status: 401 });
    const body = await readJson(request);
    const slugs = body && typeof body === "object" ? (body as { slugs?: unknown }).slugs : null;
    const result = await replaceShortlist(db, user.id, slugs);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ slugs: result.slugs });
  });
}
