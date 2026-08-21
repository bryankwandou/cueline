"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Wordmark } from "@/components/logo";

type Result = { cue: string; text?: string; error?: string; usage?: { input: number; output: number } };
type Run = {
  handle: string;
  fire_at: string;
  cues: string[];
  status: "waiting" | "running" | "done" | "failed";
  results: Result[];
};

/**
 * Where a handed-over run is read back.
 *
 * Deliberately its own URL rather than a panel in the console: the person
 * checking on a seven-in-the-morning brief is often on a different device
 * from the one that queued it, and localStorage does not travel.
 */
export default function RunPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params);
  const [run, setRun] = useState<Run | null>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let live = true;
    const pull = async () => {
      const res = await fetch(`/api/schedule/${handle}`, { cache: "no-store" });
      if (!live) return;
      if (res.status === 404) return setGone(true);
      setRun(await res.json());
    };
    void pull();
    const id = setInterval(pull, 5000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [handle]);

  return (
    <div className="relative z-10 min-h-dvh">
      <header className="border-b border-line px-6 py-4">
        <Link href="/console" className="inline-block">
          <Wordmark />
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        {gone ? (
          <p className="text-muted">
            No run under that handle. It may have finished more than a week ago and been cleared.
          </p>
        ) : !run ? (
          <p className="text-faint">Reading…</p>
        ) : (
          <>
            <p className="text-xs uppercase tracking-[0.14em] text-faint">
              {run.status === "waiting"
                ? `Waiting — fires ${new Date(run.fire_at).toLocaleString()}`
                : run.status === "running"
                  ? "Running now"
                  : run.status === "failed"
                    ? "This run failed"
                    : "Finished"}
            </p>
            <h1 className="mt-2 text-2xl">
              {run.cues.length} {run.cues.length === 1 ? "cue" : "cues"}
            </h1>

            <ol className="mt-8 space-y-4">
              {run.cues.map((cue, i) => {
                const r = run.results[i];
                return (
                  <li key={i} className="rounded-[var(--r-panel)] border border-line p-4">
                    <p className="text-sm text-muted">{cue}</p>
                    {r?.text && (
                      <p className="unfold mt-3 whitespace-pre-wrap border-t border-line pt-3 text-sm text-fg">
                        {r.text}
                      </p>
                    )}
                    {r?.error && (
                      <p className="mt-3 border-t border-line pt-3 text-sm text-red-400">{r.error}</p>
                    )}
                    {!r && run.status === "waiting" && (
                      <p className="mt-3 text-xs text-faint">Not sent yet.</p>
                    )}
                  </li>
                );
              })}
            </ol>

            <p className="mt-10 text-xs leading-relaxed text-faint">
              Anyone with this address can read the replies, so treat it like the replies themselves.
              The key that ran this queue was erased from the record the moment the last cue came back.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
