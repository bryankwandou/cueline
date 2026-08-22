import { NextResponse } from "next/server";
import { migrate, sql } from "@/lib/db";
import { handle, seal } from "@/lib/vault";
import { caller, overLimit } from "@/lib/limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The repeats worth having. Anything else is a calendar, not a brief. */
const REPEATS = new Set(["daily", "weekdays"]);

/** Hands a queue to the server so it fires whether or not the tab is open. */
export async function POST(req: Request) {
  let body: {
    apiKey?: string;
    cues?: string[];
    fireAt?: string;
    system?: string;
    repeat?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body was not valid JSON." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  const cues = (body.cues ?? []).map((c) => String(c).trim()).filter(Boolean);
  const fireAt = body.fireAt ? new Date(body.fireAt) : null;

  if (!apiKey) return NextResponse.json({ error: "A cloud run needs a key." }, { status: 400 });
  if (!cues.length) return NextResponse.json({ error: "The queue was empty." }, { status: 400 });
  if (!fireAt || Number.isNaN(fireAt.getTime())) {
    return NextResponse.json({ error: "That fire time did not parse." }, { status: 400 });
  }
  if (fireAt.getTime() < Date.now() - 60_000) {
    return NextResponse.json({ error: "That time is already behind us." }, { status: 400 });
  }
  if (cues.length > 12) {
    return NextResponse.json({ error: "Twelve cues to a run, at most." }, { status: 400 });
  }

  // A brief that only ever lands once is not a brief, it is a reminder. But a
  // repeating run has to keep its key between firings, which is a real cost to
  // the reader — so it is opt-in, and the console says so beside the control.
  const repeat = body.repeat && body.repeat !== "once" ? body.repeat : null;
  if (repeat && !REPEATS.has(repeat)) {
    return NextResponse.json({ error: "That repeat is not one we know." }, { status: 400 });
  }

  await migrate();

  // Checked after the cheap validation and before anything is stored, so a
  // flood costs one count query and never leaves a key behind.
  const who = caller(req);
  const refusal = await overLimit(who);
  if (refusal) return NextResponse.json({ error: refusal }, { status: 429 });

  const id = handle();
  await sql()`
    INSERT INTO runs (handle, fire_at, cues, sealed_key, system, repeat_rule, caller)
    VALUES (${id}, ${fireAt.toISOString()}, ${JSON.stringify(cues)}, ${seal(apiKey)},
            ${body.system ?? null}, ${repeat}, ${who})`;

  return NextResponse.json({
    handle: id,
    fireAt: fireAt.toISOString(),
    cues: cues.length,
    repeat,
  });
}
