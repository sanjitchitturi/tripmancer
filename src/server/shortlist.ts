import { getDestination } from "@/data/destinations";
import type { Db } from "@/server/db";

const MAX_ITEMS = 50;

export function sanitizeSlugs(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const slugs: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !getDestination(item) || slugs.includes(item)) continue;
    slugs.push(item);
    if (slugs.length >= MAX_ITEMS) break;
  }
  return slugs;
}

export async function listShortlist(db: Db, userId: string) {
  const rows = await db.query<{ slug: string }>(
    `SELECT slug FROM shortlist_items WHERE user_id = $1 ORDER BY position ASC, slug ASC`,
    [userId],
  );
  return rows.map((row) => row.slug).filter((slug) => getDestination(slug));
}

export async function replaceShortlist(db: Db, userId: string, value: unknown) {
  const slugs = sanitizeSlugs(value);
  if (!slugs) return { ok: false as const, error: "That shortlist could not be saved." };
  await db.query(`DELETE FROM shortlist_items WHERE user_id = $1`, [userId]);
  for (let index = 0; index < slugs.length; index += 1) {
    await db.query(
      `INSERT INTO shortlist_items (user_id, slug, position) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, slug) DO UPDATE SET position = EXCLUDED.position`,
      [userId, slugs[index], index],
    );
  }
  return { ok: true as const, slugs };
}
