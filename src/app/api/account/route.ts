import { eraseAccount, exportAccountData } from "@/server/privacy";
import { endSession, handle, readJson, requireUser } from "@/server/http";

export async function GET(request: Request) {
  return handle(request, false, async ({ db, user }) => {
    const denied = requireUser(user);
    if (denied || !user) return denied ?? Response.json({ error: "Log in to continue." }, { status: 401 });
    return Response.json(await exportAccountData(db, user), {
      headers: {
        "Content-Disposition": 'attachment; filename="tripmancer-account-data.json"',
        "Cache-Control": "private, no-store",
      },
    });
  });
}

export async function DELETE(request: Request) {
  return handle(request, true, async ({ db, user }) => {
    const denied = requireUser(user);
    if (denied || !user) return denied ?? Response.json({ error: "Log in to continue." }, { status: 401 });
    const body = await readJson(request);
    const password = body && typeof body === "object" && typeof (body as { password?: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";
    const confirmation = body && typeof body === "object" && typeof (body as { confirmation?: unknown }).confirmation === "string"
      ? (body as { confirmation: string }).confirmation
      : "";
    if (!(await eraseAccount(db, user, password, confirmation))) {
      return Response.json({ error: user.provider === "google" ? "Type DELETE to confirm." : "Password does not match." }, { status: 401 });
    }
    await endSession(request, db);
    return Response.json({ ok: true });
  });
}
