"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mark, Wordmark } from "@/components/logo";
import { LangToggle } from "@/components/lang-toggle";
import { load, save, drop } from "@/lib/storage";
import {
  estimateCost,
  newId,
  type Cue,
  type RunMode,
  type RunResponse,
} from "@/lib/types";

export default function Console() {
  const [apiKey, setApiKey] = useState("");
  const [mode, setMode] = useState<RunMode>("execute");
  const [cues, setCues] = useState<Cue[]>([]);
  const [draft, setDraft] = useState("");

  const [h, setH] = useState(0);
  const [m, setM] = useState(30);
  const [s, setS] = useState(0);

  const [armed, setArmed] = useState(false);
  const [remaining, setRemaining] = useState(0);
  // Absolute epoch ms the queue is due to run. Survives tab throttling.
  const [fireAt, setFireAt] = useState<number | null>(null);
  const [firing, setFiring] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const hydrated = useRef(false);

  /* ---- restore last session ------------------------------------ */
  useEffect(() => {
    setApiKey(load("key", ""));
    setMode(load<RunMode>("mode", "execute"));
    setCues(load<Cue[]>("cues", []));
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (hydrated.current) save("key", apiKey);
  }, [apiKey]);
  useEffect(() => {
    if (hydrated.current) save("mode", mode);
  }, [mode]);
  useEffect(() => {
    if (hydrated.current) save("cues", cues);
  }, [cues]);

  /* ---- the clock ------------------------------------------------ */
  const fire = useCallback(async () => {
    setArmed(false);
    setFireAt(null);
    setFiring(true);

    if (mode === "reminder") {
      setNotice("Time is up. Your cues are below, ready to copy.");
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Cueline", {
          body: `${cues.length} cue${cues.length === 1 ? "" : "s"} are due.`,
        });
      }
      setFiring(false);
      return;
    }

    for (const cue of cues) {
      setCues((prev) =>
        prev.map((c) =>
          c.id === cue.id ? { ...c, status: "running", error: undefined } : c,
        ),
      );

      try {
        const res = await fetch("/api/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ apiKey, prompt: cue.body }),
        });
        const data = (await res.json()) as RunResponse & { error?: string };

        if (!res.ok) throw new Error(data.error ?? "The call failed.");

        setCues((prev) =>
          prev.map((c) =>
            c.id === cue.id
              ? {
                  ...c,
                  status: "done",
                  reply: data.text,
                  tokensIn: data.usage.input,
                  tokensOut: data.usage.output,
                  finishedAt: Date.now(),
                }
              : c,
          ),
        );
      } catch (err) {
        setCues((prev) =>
          prev.map((c) =>
            c.id === cue.id
              ? {
                  ...c,
                  status: "failed",
                  error: err instanceof Error ? err.message : "Unknown failure.",
                }
              : c,
          ),
        );
      }
    }

    setFiring(false);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Cueline", { body: "Your queue has finished running." });
    }
  }, [apiKey, cues, mode]);

  /**
   * Count against the wall clock, not by subtracting one per tick.
   *
   * Browsers throttle timers in background tabs to roughly once a minute, so
   * a decrementing counter drifts badly the moment someone switches away —
   * which is exactly what this product asks people to do. Deriving the
   * remainder from a fixed target means the tab can be throttled, suspended,
   * or restored from sleep and still fire at the right moment (late, but
   * never early and never skipped).
   */
  useEffect(() => {
    if (!armed || fireAt === null) return;

    const evaluate = () => {
      const left = Math.ceil((fireAt - Date.now()) / 1000);
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        clearInterval(tick);
        document.removeEventListener("visibilitychange", evaluate);
        void fire();
      }
    };

    const tick = setInterval(evaluate, 500);
    // Catch up the instant the tab comes back, rather than on the next tick.
    document.addEventListener("visibilitychange", evaluate);
    evaluate();

    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", evaluate);
    };
  }, [armed, fireAt, fire]);

  /* ---- derived -------------------------------------------------- */
  const totalCost = useMemo(
    () =>
      cues.reduce(
        (sum, c) => sum + estimateCost(c.tokensIn ?? 0, c.tokensOut ?? 0),
        0,
      ),
    [cues],
  );

  const clock = useMemo(() => {
    const src = armed || remaining > 0 ? remaining : h * 3600 + m * 60 + s;
    return {
      h: String(Math.floor(src / 3600)).padStart(2, "0"),
      m: String(Math.floor((src % 3600) / 60)).padStart(2, "0"),
      s: String(src % 60).padStart(2, "0"),
    };
  }, [armed, remaining, h, m, s]);

  // How much of the queue has resolved, either way. Drives the progress bar
  // and the header count; a failed cue still counts as dealt with.
  const finished = useMemo(
    () => cues.filter((c) => c.status === "done" || c.status === "failed").length,
    [cues],
  );

  const canArm =
    cues.length > 0 &&
    h * 3600 + m * 60 + s > 0 &&
    (mode === "reminder" || apiKey.trim().length > 0);

  /* ---- actions -------------------------------------------------- */
  /**
   * Local storage is not a database, and browsers clear it — on a reset, a
   * profile wipe, or a "clear site data" click. Rather than answer that by
   * holding people's queues on a server we do not want to run, the queue is
   * a file they own: exported as plain JSON, restored on any machine.
   *
   * The API key is deliberately not part of the export. A file that carries
   * a live credential is a file that leaks one.
   */
  function exportQueue() {
    const payload = {
      app: "cueline",
      version: 1,
      exportedAt: new Date().toISOString(),
      cues: cues.map((c) => ({ body: c.body })),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `cueline-queue-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice(
      `Saved ${cues.length} cue${cues.length === 1 ? "" : "s"} to a file. Your key is not in it.`,
    );
  }

  async function importQueue(file: File) {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const raw =
        typeof parsed === "object" && parsed !== null && "cues" in parsed
          ? (parsed as { cues: unknown }).cues
          : null;

      if (!Array.isArray(raw)) throw new Error("no cue list in that file");

      const restored = raw
        .map((c) =>
          typeof c === "object" && c !== null && "body" in c
            ? String((c as { body: unknown }).body)
            : "",
        )
        .filter((body) => body.trim().length > 0)
        .map((body) => ({ id: newId(), body, status: "queued" as const }));

      if (restored.length === 0) throw new Error("that file had no cues in it");

      setCues(restored);
      setNotice(
        `Restored ${restored.length} cue${restored.length === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      setNotice(
        `Could not read that file — ${err instanceof Error ? err.message : "unknown problem"}.`,
      );
    }
  }

  function addCue() {
    const body = draft.trim();
    if (!body) return;
    setCues((prev) => [...prev, { id: newId(), body, status: "queued" }]);
    setDraft("");
  }

  function removeCue(id: string) {
    setCues((prev) => prev.filter((c) => c.id !== id));
  }

  function arm() {
    if (!canArm) return;
    setCues((prev) =>
      prev.map((c) => ({
        ...c,
        status: "queued",
        reply: undefined,
        error: undefined,
      })),
    );
    const total = h * 3600 + m * 60 + s;
    setNotice(null);
    setRemaining(total);
    setFireAt(Date.now() + total * 1000);
    setArmed(true);
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }

  function disarm() {
    setArmed(false);
    setFireAt(null);
    setRemaining(0);
  }

  function forgetKey() {
    setApiKey("");
    drop("key");
    setNotice("Key cleared from this browser.");
  }

  /* ---- view ----------------------------------------------------- */
  return (
    <div className="relative z-10 min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/">
            <Wordmark size={24} />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {armed && (
              <span className="flex items-center gap-2 text-accent">
                <span className="armed h-1.5 w-1.5 rounded-full bg-accent" />
                Armed
              </span>
            )}
            {firing && (
              <span className="text-muted">
                Running cue {finished + 1} of {cues.length}
              </span>
            )}
            <LangToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[360px_1fr]">
        {/* ---------------- left rail ---------------- */}
        <div className="space-y-6">
          <Panel title="Timer">
            <div
              className={`tnum flex items-baseline justify-center gap-1.5 rounded-[var(--r-control)] border border-line bg-bg-raised py-8 font-mono text-5xl font-medium ${
                armed ? "armed" : ""
              }`}
            >
              <span>{clock.h}</span>
              <span className="text-faint">:</span>
              <span>{clock.m}</span>
              <span className="text-faint">:</span>
              <span className={armed ? "text-accent" : ""}>{clock.s}</span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <NumField label="hours" value={h} onChange={setH} max={23} disabled={armed} />
              <NumField label="minutes" value={m} onChange={setM} max={59} disabled={armed} />
              <NumField label="seconds" value={s} onChange={setS} max={59} disabled={armed} />
            </div>

            {armed ? (
              <button
                onClick={disarm}
                className="press mt-4 w-full rounded-[var(--r-control)] border border-line-strong py-3 font-medium hover:bg-panel-hover"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={arm}
                disabled={!canArm}
                className="press mt-4 w-full rounded-[var(--r-control)] bg-accent py-3 font-medium text-[#1a1206] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:active:transform-none"
              >
                Arm the queue
              </button>
            )}

            {!canArm && !armed && (
              <p className="mt-3 text-xs leading-relaxed text-faint">
                {cues.length === 0
                  ? "Add at least one cue below."
                  : mode === "execute" && !apiKey.trim()
                    ? "Paste an API key, or switch to reminder mode."
                    : "Set a duration above zero."}
              </p>
            )}
          </Panel>

          <Panel title="Mode">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["execute", "Run them"],
                  ["reminder", "Just remind me"],
                ] as [RunMode, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  disabled={armed}
                  className={`press rounded-[var(--r-control)] border py-2.5 text-sm disabled:opacity-40 ${
                    mode === value
                      ? "border-accent-line bg-accent-dim text-fg"
                      : "border-line text-muted hover:bg-panel-hover"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-faint">
              {mode === "execute"
                ? "Cues are sent to Claude Haiku 4.5 with your key when the clock hits zero."
                : "Nothing is sent anywhere. You get a nudge and the cues laid out to copy."}
            </p>
          </Panel>

          {mode === "execute" && (
            <Panel title="API key">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-…"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-[var(--r-control)] border border-line bg-bg-raised px-3.5 py-2.5 font-mono text-sm outline-none transition-colors duration-150 focus:border-accent-line"
              />
              <div className="mt-3 flex items-center justify-between">
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted underline-offset-4 transition-colors duration-150 hover:text-fg hover:underline"
                >
                  Get one from the Console
                </a>
                {apiKey && (
                  <button
                    onClick={forgetKey}
                    className="text-xs text-faint transition-colors duration-150 hover:text-bad"
                  >
                    Forget it
                  </button>
                )}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-faint">
                Stays in this browser. It is attached to each call as it fires
                and is not stored on any server.
              </p>
            </Panel>
          )}

          {totalCost > 0 && (
            <Panel title="Spent this run">
              <p className="tnum font-mono text-2xl text-accent">
                ${totalCost.toFixed(5)}
              </p>
              <p className="mt-2 text-xs text-faint">
                Billed by Anthropic against your key. Cueline adds nothing.
              </p>
            </Panel>
          )}
        </div>

        {/* ---------------- queue ---------------- */}
        <div className="space-y-6">
          {notice && (
            <div
              role="status"
              aria-live="polite"
              className="notice-in rounded-[var(--r-panel)] border border-accent-line bg-accent-dim px-5 py-4 text-sm"
            >
              {notice}
            </div>
          )}

          <Panel title={`Queue — ${cues.length} cue${cues.length === 1 ? "" : "s"}`}>
            {firing && cues.length > 0 && (
              <div
                className="progress-track mb-5"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={cues.length}
                aria-valuenow={finished}
                aria-label="Queue progress"
              >
                <div
                  className="progress-fill"
                  style={{ width: `${(finished / cues.length) * 100}%` }}
                />
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addCue();
                }}
                rows={2}
                placeholder="What would you have typed? e.g. Summarise yesterday's commits into three bullets."
                className="flex-1 resize-none rounded-[var(--r-control)] border border-line bg-bg-raised px-3.5 py-3 text-sm leading-relaxed outline-none transition-colors duration-150 focus:border-accent-line"
              />
              <button
                onClick={addCue}
                disabled={!draft.trim()}
                className="press rounded-[var(--r-control)] border border-line-strong px-5 py-3 text-sm font-medium hover:bg-panel-hover disabled:opacity-30 disabled:active:transform-none sm:self-start"
              >
                Add
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <button
                onClick={exportQueue}
                disabled={cues.length === 0}
                className="text-muted underline-offset-4 transition-colors duration-150 hover:text-fg hover:underline disabled:opacity-30 disabled:no-underline"
              >
                Save queue to a file
              </button>
              <label className="cursor-pointer text-muted underline-offset-4 transition-colors duration-150 hover:text-fg hover:underline">
                Restore from a file
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importQueue(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <span className="text-faint">
                Survives a browser reset. The key is never in the file.
              </span>
            </div>

            {cues.length === 0 ? (
              <div className="mt-8 flex flex-col items-center gap-4 py-12 text-center">
                <Mark size={34} />
                <p className="max-w-sm leading-relaxed text-muted">
                  Nothing queued yet. Add the prompt you send most mornings and
                  it will never need typing again.
                </p>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {cues.map((cue, i) => (
                  <CueRow
                    key={cue.id}
                    index={i}
                    cue={cue}
                    locked={armed || firing}
                    onRemove={() => removeCue(cue.id)}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--r-panel)] border border-line bg-panel p-6">
      <h2 className="mb-4 text-xs tracking-wide text-faint uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function NumField({
  label,
  value,
  onChange,
  max,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max: number;
  disabled: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] text-faint">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) =>
          onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))
        }
        className="tnum w-full rounded-[var(--r-control)] border border-line bg-bg-raised px-3 py-2 text-center font-mono outline-none transition-colors duration-150 focus:border-accent-line disabled:opacity-40"
      />
    </label>
  );
}

function CueRow({
  index,
  cue,
  locked,
  onRemove,
}: {
  index: number;
  cue: Cue;
  locked: boolean;
  onRemove: () => void;
}) {
  const dot =
    cue.status === "done"
      ? "bg-ok"
      : cue.status === "failed"
        ? "bg-bad"
        : cue.status === "running"
          ? "bg-accent dot-running"
          : "bg-faint";

  return (
    <li className="slot-in rounded-[var(--r-control)] border border-line bg-bg-raised">
      <div className="flex items-start gap-3.5 px-4 py-3.5">
        <span className="tnum mt-0.5 font-mono text-xs text-faint">
          {String(index + 1).padStart(2, "0")}
        </span>
        <p className="flex-1 text-sm leading-relaxed">{cue.body}</p>
        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
        {!locked && (
          <button
            onClick={onRemove}
            aria-label="Remove cue"
            className="mt-0.5 text-xs text-faint transition-colors duration-150 hover:text-bad"
          >
            Remove
          </button>
        )}
      </div>

      {cue.reply && (
        <div className="unfold border-t border-line px-4 py-3.5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted">
            {cue.reply}
          </p>
          <p className="tnum mt-3 font-mono text-[11px] text-faint">
            {cue.tokensIn} in · {cue.tokensOut} out · $
            {estimateCost(cue.tokensIn ?? 0, cue.tokensOut ?? 0).toFixed(5)}
          </p>
        </div>
      )}

      {cue.error && (
        <div className="unfold border-t border-line px-4 py-3.5">
          <p className="text-sm leading-relaxed text-bad">{cue.error}</p>
        </div>
      )}
    </li>
  );
}
