import { createHash } from "node:crypto";
import { sql } from "@/lib/db";

/**
 * Scheduling is the one endpoint that costs somebody money — every accepted
 * run turns into calls against a reader's key, and the row holds that key
 * until it fires. So it is the one endpoint worth putting a ceiling on.
 *
 * The count lives in the runs table rather than in memory. Serverless hands
 * each request whatever instance is free, so an in-memory tally would be a
 * limit per instance, which is to say no limit at all.
 */
const PER_HOUR = 10;
const PER_DAY = 40;

/** Who asked. Behind Vercel the client address is the first hop in the chain. */
export function caller(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  // Salted with the vault secret so the column is a counter, not an address book.
  return createHash("sha256").update(`${process.env.VAULT_SECRET ?? ""}:${ip}`).digest("base64url").slice(0, 22);
}

/** Null when the caller may proceed; otherwise the sentence to send back. */
export async function overLimit(who: string): Promise<string | null> {
  const [row] = (await sql()`
    SELECT
      count(*) FILTER (WHERE created_at > now() - INTERVAL '1 hour') AS hour,
      count(*) FILTER (WHERE created_at > now() - INTERVAL '1 day')  AS day
    FROM runs WHERE caller = ${who}`) as { hour: string; day: string }[];

  if (Number(row?.hour ?? 0) >= PER_HOUR) {
    return `That is ${PER_HOUR} runs in an hour from here. Give it an hour.`;
  }
  if (Number(row?.day ?? 0) >= PER_DAY) {
    return `That is ${PER_DAY} runs in a day from here. Come back tomorrow.`;
  }
  return null;
}
