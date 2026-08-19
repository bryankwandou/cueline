"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mark, Wordmark } from "@/components/logo";
import { LangToggle } from "@/components/lang-toggle";
import { useT } from "@/lib/i18n";
import { load, save, drop } from "@/lib/storage";
import {
  estimateCost,
  newId,
  type Cue,
  type RunMode,
  type RunResponse,
} from "@/lib/types";

export default function Console() {
  const t = useT();

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
      setNotice(t("c.dueNotice"));
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification("Cueline", {
          body: t("c.dueBody", { a: cues.length }),
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

        if (!res.ok) throw new Error(data.error ?? t("c.callFailed"));

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
                  error:
                    err instanceof Error ? err.message : t("c.unknownFailure"),
                }
              : c,
          ),
        );
      }
    }

    setFiring(false);
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      new Notification("Cueline", { body: t("c.finishedBody") });
    }
  }, [apiKey, cues, mode, t]);

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
    () =>
      cues.filter((c) => c.status === "done" || c.status === "failed").length,
    [cues],
  );

  /**
   * A duration is easy to type and hard to picture. Showing the wall-clock
   * time it lands on turns "02:45:00" into something you can sanity-check
   * against the morning you actually had in mind.
   */
  const landsAt = useMemo(() => {
    const total = armed ? remaining : h * 3600 + m * 60 + s;
    if (total <= 0) return null;
    return new Date(Date.now() + total * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [armed, remaining, h, m, s]);

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
    setNotice(t("c.exported", { a: cues.length }));
  }

  async function importQueue(file: File) {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const raw =
        typeof parsed === "object" && parsed !== null && "cues" in parsed
          ? (parsed as { cues: unknown }).cues
          : null;

      if (!Array.isArray(raw)) throw new Error(t("c.importNoList"));

      const restored = raw
        .map((c) =>
          typeof c === "object" && c !== null && "body" in c
            ? String((c as { body: unknown }).body)
            : "",
        )
        .filter((body) => body.trim().length > 0)
        .map((body) => ({ id: newId(), body, status: "queued" as const }));

      if (restored.length === 0) throw new Error(t("c.importEmpty"));

      setCues(restored);
      setNotice(t("c.imported", { a: restored.length }));
    } catch (err) {
      setNotice(
        t("c.importBad", {
          a: err instanceof Error ? err.message : t("c.unknownProblem"),
        }),
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

  function editCue(id: string, body: string) {
    setCues((prev) => prev.map((c) => (c.id === id ? { ...c, body } : c)));
  }

  /**
   * The product sells an ordered queue, so the order has to be editable.
   * Buttons rather than drag: this list is short, the rows are tall, and a
   * drag handle is the one control that stops working entirely on a phone
   * and for anyone driving the page from a keyboard.
   */
  function moveCue(index: number, direction: -1 | 1) {
    setCues((prev) => {
      const to = index + direction;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
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
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
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
    setNotice(t("c.keyCleared"));
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
                {t("c.armed")}
              </span>
            )}
            {firing && (
              <span className="text-muted">
                {t("c.running", { a: finished + 1, b: cues.length })}
              </span>
            )}
            <LangToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[360px_1fr]">
        {/* ---------------- left rail ---------------- */}
        <div className="space-y-6">
          <Panel title={t("c.timer")}>
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

            {landsAt && (
              <p className="tnum mt-3 text-center font-mono text-xs text-faint">
                {t("c.fireAt", { a: landsAt })}
              </p>
            )}

            <div className="mt-4 grid grid-cols-3 gap-3">
              <NumField
                label={t("c.hours")}
                value={h}
                onChange={setH}
                max={23}
                disabled={armed}
              />
              <NumField
                label={t("c.minutes")}
                value={m}
                onChange={setM}
                max={59}
                disabled={armed}
              />
              <NumField
                label={t("c.seconds")}
                value={s}
                onChange={setS}
                max={59}
                disabled={armed}
              />
            </div>

            {armed ? (
              <button
                onClick={disarm}
                className="press mt-4 w-full rounded-[var(--r-control)] border border-line-strong py-3 font-medium hover:bg-panel-hover"
              >
                {t("c.cancel")}
              </button>
            ) : (
              <button
                onClick={arm}
                disabled={!canArm}
                className="press mt-4 w-full rounded-[var(--r-control)] bg-accent py-3 font-medium text-[#1a1206] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {t("c.arm")}
              </button>
            )}

            {!canArm && !armed && (
              <p className="mt-3 text-xs leading-relaxed text-faint">
                {cues.length === 0
                  ? t("c.needCue")
                  : mode === "execute" && !apiKey.trim()
                    ? t("c.needKey")
                    : t("c.needTime")}
              </p>
            )}
          </Panel>

          <Panel title={t("c.mode")}>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["execute", t("c.modeRun")],
                  ["reminder", t("c.modeRemind")],
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
              {mode === "execute" ? t("c.modeRunNote") : t("c.modeRemindNote")}
            </p>
          </Panel>

          {mode === "execute" && (
            <Panel title={t("c.key")}>
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
                  {t("c.keyGet")}
                </a>
                {apiKey && (
                  <button
                    onClick={forgetKey}
                    className="text-xs text-faint transition-colors duration-150 hover:text-bad"
                  >
                    {t("c.keyForget")}
                  </button>
                )}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-faint">
                {t("c.keyNote")}
              </p>
            </Panel>
          )}

          {totalCost > 0 && (
            <Panel title={t("c.spent")}>
              <p className="tnum font-mono text-2xl text-accent">
                ${totalCost.toFixed(5)}
              </p>
              <p className="mt-2 text-xs text-faint">{t("c.spentNote")}</p>
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

          <Panel
            title={
              cues.length === 1
                ? t("c.queue1")
                : t("c.queueN", { a: cues.length })
            }
          >
            {firing && cues.length > 0 && (
              <div
                className="progress-track mb-5"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={cues.length}
                aria-valuenow={finished}
                aria-label={t("c.running", {
                  a: finished + 1,
                  b: cues.length,
                })}
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
                placeholder={t("c.draft")}
                className="flex-1 resize-none rounded-[var(--r-control)] border border-line bg-bg-raised px-3.5 py-3 text-sm leading-relaxed outline-none transition-colors duration-150 focus:border-accent-line"
              />
              <button
                onClick={addCue}
                disabled={!draft.trim()}
                className="press rounded-[var(--r-control)] border border-line-strong px-5 py-3 text-sm font-medium hover:bg-panel-hover disabled:opacity-30 sm:self-start"
              >
                {t("c.add")}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <button
                onClick={exportQueue}
                disabled={cues.length === 0}
                className="text-muted underline-offset-4 transition-colors duration-150 hover:text-fg hover:underline disabled:opacity-30 disabled:no-underline"
              >
                {t("c.export")}
              </button>
              <label className="cursor-pointer text-muted underline-offset-4 transition-colors duration-150 hover:text-fg hover:underline">
                {t("c.import")}
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
              <span className="text-faint">{t("c.fileNote")}</span>
            </div>

            {cues.length === 0 ? (
              <div className="mt-8 flex flex-col items-center gap-4 py-12 text-center">
                <Mark size={34} />
                <p className="max-w-sm leading-relaxed text-muted">
                  {t("c.emptyTitle")}
                </p>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {cues.map((cue, i) => (
                  <CueRow
                    key={cue.id}
                    index={i}
                    total={cues.length}
                    cue={cue}
                    locked={armed || firing}
                    onRemove={() => removeCue(cue.id)}
                    onEdit={(body) => editCue(cue.id, body)}
                    onMove={(d) => moveCue(i, d)}
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

/**
 * A button that reports success in place for a moment.
 *
 * "Copied" as a toast in the corner asks the eye to leave the thing it just
 * acted on. Swapping the label is smaller and lands where the pointer
 * already is.
 */
function CopyButton({
  text,
  label,
  done,
  className = "",
}: {
  text: string;
  label: string;
  done: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);

  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => setCopied(true));
      }}
      className={`transition-colors duration-150 ${
        copied ? "text-ok" : "text-faint hover:text-fg"
      } ${className}`}
    >
      {copied ? done : label}
    </button>
  );
}

function CueRow({
  index,
  total,
  cue,
  locked,
  onRemove,
  onEdit,
  onMove,
}: {
  index: number;
  total: number;
  cue: Cue;
  locked: boolean;
  onRemove: () => void;
  onEdit: (body: string) => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [buffer, setBuffer] = useState(cue.body);

  const dot =
    cue.status === "done"
      ? "bg-ok"
      : cue.status === "failed"
        ? "bg-bad"
        : cue.status === "running"
          ? "bg-accent dot-running"
          : "bg-faint";

  function commit() {
    const body = buffer.trim();
    if (body) onEdit(body);
    setEditing(false);
  }

  return (
    <li className="slot-in rounded-[var(--r-control)] border border-line bg-bg-raised">
      <div className="flex items-start gap-3.5 px-4 py-3.5">
        <span className="tnum mt-0.5 font-mono text-xs text-faint">
          {String(index + 1).padStart(2, "0")}
        </span>

        {editing ? (
          <div className="flex-1">
            <textarea
              value={buffer}
              autoFocus
              rows={3}
              onChange={(e) => setBuffer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
                if (e.key === "Escape") {
                  setBuffer(cue.body);
                  setEditing(false);
                }
              }}
              className="w-full resize-none rounded-[var(--r-field)] border border-accent-line bg-panel px-3 py-2 text-sm leading-relaxed outline-none"
            />
            <div className="mt-2 flex gap-4 text-xs">
              <button
                onClick={commit}
                className="text-accent transition-colors duration-150 hover:text-fg"
              >
                {t("c.save")}
              </button>
              <button
                onClick={() => {
                  setBuffer(cue.body);
                  setEditing(false);
                }}
                className="text-faint transition-colors duration-150 hover:text-fg"
              >
                {t("c.discard")}
              </button>
            </div>
          </div>
        ) : (
          <p className="flex-1 text-sm leading-relaxed">{cue.body}</p>
        )}

        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />

        {!locked && !editing && (
          <div className="mt-0.5 flex shrink-0 items-center gap-3 text-xs">
            {/* Reordering is only meaningful with something to trade places
                with, so the arrows disappear at the ends of the list rather
                than sitting there greyed out. */}
            {index > 0 && (
              <button
                onClick={() => onMove(-1)}
                aria-label={t("c.up")}
                title={t("c.up")}
                className="text-faint transition-colors duration-150 hover:text-fg"
              >
                ↑
              </button>
            )}
            {index < total - 1 && (
              <button
                onClick={() => onMove(1)}
                aria-label={t("c.down")}
                title={t("c.down")}
                className="text-faint transition-colors duration-150 hover:text-fg"
              >
                ↓
              </button>
            )}
            <button
              onClick={() => {
                setBuffer(cue.body);
                setEditing(true);
              }}
              className="text-faint transition-colors duration-150 hover:text-fg"
            >
              {t("c.edit")}
            </button>
            <CopyButton
              text={cue.body}
              label={t("c.copyCue")}
              done={t("c.copied")}
            />
            <button
              onClick={onRemove}
              aria-label={t("c.remove")}
              className="text-faint transition-colors duration-150 hover:text-bad"
            >
              {t("c.remove")}
            </button>
          </div>
        )}
      </div>

      {cue.reply && (
        <div className="unfold border-t border-line px-4 py-3.5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted">
            {cue.reply}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="tnum font-mono text-[11px] text-faint">
              {t("c.usage", {
                a: cue.tokensIn ?? 0,
                b: cue.tokensOut ?? 0,
                c: estimateCost(
                  cue.tokensIn ?? 0,
                  cue.tokensOut ?? 0,
                ).toFixed(5),
              })}
            </p>
            <CopyButton
              text={cue.reply}
              label={t("c.copy")}
              done={t("c.copied")}
              className="text-[11px]"
            />
          </div>
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
