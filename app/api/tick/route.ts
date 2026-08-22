import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { migrate, sql, sweep } from "@/lib/db";
import { handle as newHandle, open } from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * When a repeating run should land next.
 *
 * Counted from the time it was *due*, not the time it finished, so a run that
 * fired eight seconds late does not walk its own schedule forward eight
 * seconds a day. If the server was down long enough to miss several turns,
 * the loop skips the missed ones rather than firing a backlog at once —
 * nobody wants four days of morning briefs arriving together.
 */
function nextFire(from: string, rule: string): Date {
  const at = new Date(from);
  do {
    at.setUTCDate(at.getUTCDate() + 1);
    // Saturday and Sunday are not workdays, and this is a workday product.
    if (rule === "weekdays") while (at.getUTCDay() === 0 || at.getUTCDay() === 6) {
      at.setUTCDate(at.getUTCDate() + 1);
    }
  } while (at.getTime() <= Date.now());
  return at;
}

const SYSTEM =
  "Answer directly and completely. Skip preamble and closing offers of further help. The reader is catching up on their day and will not reply.";

/**
 * The part that runs when nobody is watching.
 *
 * A GitHub Actions shift calls this every 30 seconds; a once-daily Vercel
 * cron sits underneath as a floor. Measured lateness on the free tier is
 * about half a minute. It claims due rows one at a time with
 * a conditional UPDATE, so two overlapping invocations cannot both send the
 * same queue — the second one finds nothing left to claim.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "not yours" }, { status: 401 });
  }

  await migrate();

  const claimed = await sql()`
    UPDATE runs SET status = 'running'
    WHERE handle IN (
      SELECT handle FROM runs
      WHERE status = 'waiting' AND fire_at <= now()
      ORDER BY fire_at LIMIT 3
    )
    RETURNING handle, cues, sealed_key, system, fire_at, repeat_rule`;

  const done: string[] = [];

  for (const row of claimed as {
    handle: string;
    cues: string[];
    sealed_key: string;
    system: string | null;
    fire_at: string;
    repeat_rule: string | null;
  }[]) {
    const results: unknown[] = [];
    let key: string;
    try {
      key = open(row.sealed_key);
    } catch {
      await sql()`UPDATE runs SET status='failed', settled_at=now(),
        results=${JSON.stringify([{ error: "The stored key could not be read." }])}
        WHERE handle=${row.handle}`;
      continue;
    }

    const client = new Anthropic({ apiKey: key });

    for (const cue of row.cues) {
      try {
        const msg = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 2048,
          system: row.system?.trim() || SYSTEM,
          messages: [{ role: "user", content: cue }],
        });
        results.push({
          cue,
          text: msg.content
            .filter((b) => b.type === "text")
            .map((b) => (b as { text: string }).text)
            .join("\n")
            .trim(),
          usage: { input: msg.usage.input_tokens, output: msg.usage.output_tokens },
        });
      } catch (err) {
        results.push({
          cue,
          error: err instanceof Anthropic.APIError ? err.message : "The request did not reach the API.",
        });
      }
    }

    // A repeating run has to hand its key to tomorrow before today lets go of
    // it, so the copy happens first and the wipe second. If the insert fails
    // the key stays put and the chain survives to be retried; if the wipe
    // fails, the worst case is one stale key, not a broken schedule.
    let next: string | null = null;
    if (row.repeat_rule) {
      next = newHandle();
      await sql()`
        INSERT INTO runs (handle, fire_at, cues, sealed_key, system, repeat_rule)
        VALUES (${next}, ${nextFire(row.fire_at, row.repeat_rule).toISOString()},
                ${JSON.stringify(row.cues)}, ${row.sealed_key}, ${row.system},
                ${row.repeat_rule})`;
    }

    // The key has done its one job. Overwriting it here means a finished run
    // sitting in the table is no longer a key waiting to be stolen.
    await sql()`
      UPDATE runs
      SET status='done', settled_at=now(), sealed_key='',
          results=${JSON.stringify(results)}, next_handle=${next}
      WHERE handle=${row.handle}`;
    done.push(row.handle);
  }

  await sweep();
  return NextResponse.json({ ran: done.length, handles: done });
}
