import { connection } from "next/server";
import { databaseMode, getDb } from "@/server/db";

export async function GET() {
  await connection();
  try {
    const db = await getDb();
    await db.query("SELECT 1 AS ok");
    return Response.json({ ok: true, database: databaseMode() });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
