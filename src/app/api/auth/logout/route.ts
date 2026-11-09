import { endSession, handle } from "@/server/http";

export async function POST(request: Request) {
  return handle(request, true, async ({ db }) => {
    await endSession(request, db);
    return Response.json({ ok: true });
  });
}
