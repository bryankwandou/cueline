import { NextResponse } from "next/server";
import { migrate, sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ handle: string }> };

/**
 * Reads back a run. The sealed key is never part of the answer — only
 * `key_held`, a plain boolean saying whether the row still holds one. That
 * is enough for anyone to watch the key disappear when the run settles,
 * and it hands out nothing that could be decrypted.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { handle } = await params;
  await migrate();
  const rows = (await sql()`
    SELECT handle, fire_at, cues, status, results, settled_at,
           repeat_rule, next_handle,
           sealed_key <> '' AS key_held
    FROM runs WHERE handle = ${handle}`) as Record<string, unknown>[];
  if (!rows.length) return NextResponse.json({ error: "No such run." }, { status: 404 });
  return NextResponse.json(rows[0]);
}

/** Calls a waiting run off, and shreds the key with it. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { handle } = await params;
  await migrate();
  await sql()`DELETE FROM runs WHERE handle = ${handle}`;
  return NextResponse.json({ ok: true });
}
