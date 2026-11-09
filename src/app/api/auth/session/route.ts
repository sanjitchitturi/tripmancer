import { handle } from "@/server/http";

export async function GET(request: Request) {
  return handle(request, false, async ({ user }) => {
    return Response.json({ user: user ? { email: user.email, name: user.name, provider: user.provider } : null });
  });
}
