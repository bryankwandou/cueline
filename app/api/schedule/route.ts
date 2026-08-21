import { NextResponse } from "next/server";
import { migrate, sql } from "@/lib/db";
import { handle, seal } from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hands a queue to the server so it fires whether or not the tab is open. */
export async function POST(req: Request) {
  let body: { apiKey?: string; cues?: string[]; fireAt?: string; system?: string };
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

  await migrate();
  const id = handle();
  await sql()`
    INSERT INTO runs (handle, fire_at, cues, sealed_key, system)
    VALUES (${id}, ${fireAt.toISOString()}, ${JSON.stringify(cues)}, ${seal(apiKey)}, ${body.system ?? null})`;

  return NextResponse.json({ handle: id, fireAt: fireAt.toISOString(), cues: cues.length });
}
