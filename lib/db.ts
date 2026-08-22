import { neon } from "@neondatabase/serverless";

/**
 * One table. A scheduled run is a row: when it fires, what to send, the
 * sealed key, and whatever came back. Rows delete themselves a week after
 * they finish — see `sweep` — so the store does not quietly become an
 * archive of everybody's morning briefs.
 */
// Built on first use, not at import. Reading the connection string while the
// module evaluates would make the build itself need a database, which it does
// not — nothing queries until a request arrives.
let client: ReturnType<typeof neon> | null = null;
export function sql() {
  return (client ??= neon(process.env.DATABASE_URL!));
}

let ready: Promise<void> | null = null;

export function migrate(): Promise<void> {
  ready ??= (async () => {
    await sql()`
      CREATE TABLE IF NOT EXISTS runs (
        handle      TEXT PRIMARY KEY,
        fire_at     TIMESTAMPTZ NOT NULL,
        cues        JSONB NOT NULL,
        sealed_key  TEXT NOT NULL,
        system      TEXT,
        status      TEXT NOT NULL DEFAULT 'waiting',
        results     JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        settled_at  TIMESTAMPTZ
      )`;
    await sql()`CREATE INDEX IF NOT EXISTS runs_due ON runs (status, fire_at)`;
    // Added after the first runs existed, so it has to arrive as an alter
    // rather than part of the create. Null means the run happens once.
    await sql()`ALTER TABLE runs ADD COLUMN IF NOT EXISTS repeat_rule TEXT`;
    await sql()`ALTER TABLE runs ADD COLUMN IF NOT EXISTS next_handle TEXT`;
    // A salted digest of the caller, never the address itself. It exists only
    // so a burst from one place can be counted and stopped; it cannot be read
    // back into an IP, and it goes when the row does.
    await sql()`ALTER TABLE runs ADD COLUMN IF NOT EXISTS caller TEXT`;
    // Minutes east of UTC, as the browser reported them. Only the weekend
    // rule reads it, and only so the weekend is the reader's weekend.
    await sql()`ALTER TABLE runs ADD COLUMN IF NOT EXISTS tz_offset INT NOT NULL DEFAULT 0`;
    await sql()`CREATE INDEX IF NOT EXISTS runs_caller ON runs (caller, created_at)`;
  })();
  return ready;
}

export async function sweep() {
  await sql()`DELETE FROM runs WHERE settled_at IS NOT NULL AND settled_at < now() - INTERVAL '7 days'`;
}
