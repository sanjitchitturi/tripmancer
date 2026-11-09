import { verifyPassword } from "@/server/passwords";
import type { PublicUser } from "@/server/accounts";
import type { Db } from "@/server/db";
import { listShortlist } from "@/server/shortlist";
import { listTrips } from "@/server/trips";

interface PasswordRow {
  password_hash: string;
}

export async function exportAccountData(db: Db, user: PublicUser) {
  const [trips, shortlist] = await Promise.all([listTrips(db, user.id), listShortlist(db, user.id)]);
  return {
    exportedAt: new Date().toISOString(),
    format: "tripmancer-account-export-v1",
    account: { email: user.email, name: user.name, provider: user.provider },
    trips,
    shortlist,
  };
}

export async function eraseAccount(db: Db, user: PublicUser, password: string, confirmation = "") {
  if (user.provider === "google") {
    if (confirmation !== "DELETE") return false;
  } else {
    if (password.length < 8 || password.length > 200) return false;
    const rows = await db.query<PasswordRow>(`SELECT password_hash FROM users WHERE id = $1`, [user.id]);
    const hash = rows[0]?.password_hash;
    if (!hash || !(await verifyPassword(password, hash))) return false;
  }

  // The user deletion cascades to sessions, saved trips, and shortlist items.
  await db.query(`DELETE FROM login_attempts WHERE email = $1`, [user.email]);
  await db.query(`DELETE FROM users WHERE id = $1`, [user.id]);
  return true;
}
