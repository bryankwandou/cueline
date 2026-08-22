"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

type Phase = "idle" | "armed" | "landed";

const CHOICES = [10, 30, 60] as const;

/**
 * The product, running in the hero.
 *
 * What used to sit here was a drawing of a timer: a clock counting to a 07:00
 * nobody had chosen, above three cues nobody had written. A reader had to take
 * the whole idea on trust before they were allowed to touch anything.
 *
 * This is the same thing made real. The cue is theirs, the countdown is real,
 * and when it reaches zero the page does what the product does in reminder
 * mode — surfaces the cue ready to use, and raises a notification if one is
 * allowed. No key, no account, and no request leaves the browser, which is the
 * honest half of the product to put first.
 */
export function TryIt() {
  const t = useT();

  const presets = useMemo(
    () =>
      [
        [t("try.p1"), t("try.p1body")],
        [t("try.p2"), t("try.p2body")],
        [t("try.p3"), t("try.p3body")],
      ] as const,
    [t],
  );

  const [cue, setCue] = useState("");
  const [span, setSpan] = useState<number>(10);
  const [left, setLeft] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [nudge, setNudge] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  // A deadline rather than a decrementing counter. Background tabs are
  // throttled to about one tick a second at best and stop outright on some
  // phones, so anything counting its own ticks drifts. Reading the clock each
  // time means a tab restored after two minutes is simply correct.
  const deadline = useRef<number>(0);

  useEffect(() => {
    if (phase !== "armed") return;
    const tick = () => {
      const rest = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setLeft(rest);
      if (rest === 0) setPhase("landed");
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "landed") return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    new Notification(t("try.notify"), { body: cue.slice(0, 140) });
  }, [phase, cue, t]);

  const start = useCallback(() => {
    if (!cue.trim()) {
      setNudge(t("try.needCue"));
      field.current?.focus();
      return;
    }
    setNudge(null);
    deadline.current = Date.now() + span * 1000;
    setLeft(span);
    setPhase("armed");
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, [cue, span, t]);

  const mmss = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(
    left % 60,
  ).padStart(2, "0")}`;

  // Drives the ring: full at the start, empty at the moment of arrival.
  const sweep =
    phase === "armed" && span > 0 ? left / span : phase === "landed" ? 0 : 1;

  return (
    <div className="hero-card rise rounded-[var(--r-hero)] border border-line bg-panel p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] sm:p-7">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <span className="text-xs tracking-wide text-faint uppercase">
          {t("try.eyebrow")}
        </span>
        <span
          className={`flex items-center gap-2 text-xs ${
            phase === "idle" ? "text-faint" : "text-accent"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              phase === "idle"
                ? "bg-faint"
                : phase === "armed"
                  ? "armed bg-accent"
                  : "bg-accent"
            }`}
          />
          {phase === "idle"
            ? t("try.idle")
            : phase === "armed"
              ? t("try.armed")
              : t("try.done")}
        </span>
      </div>

      {phase === "landed" ? (
        <div className="unfold py-6">
          <Dial value={0} label="00:00" />

          <p className="mt-6 text-center text-sm font-medium text-fg">
            {t("try.landedTitle")}
          </p>

          <blockquote className="mt-4 rounded-[var(--r-control)] border border-accent-line bg-accent-dim px-4 py-3 text-sm leading-snug text-fg">
            {cue}
          </blockquote>

          <p className="mt-4 text-xs leading-relaxed text-faint">
            {t("try.landedBody")}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setPhase("idle");
                setLeft(0);
              }}
              className="press flex-1 rounded-[var(--r-control)] border border-line-strong px-4 py-2.5 text-sm text-fg hover:bg-panel-hover"
            >
              {t("try.again")}
            </button>
            <Link
              href={`/console?cue=${encodeURIComponent(cue)}`}
              className="press flex-1 rounded-[var(--r-control)] bg-accent px-4 py-2.5 text-center text-sm font-medium text-[#1a1206] hover:-translate-y-px"
            >
              {t("try.carry")}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="py-6">
            <Dial value={sweep} label={phase === "armed" ? mmss : "--:--"} />
          </div>

          <label className="block">
            <span className="mb-2 block text-[11px] tracking-wide text-faint uppercase">
              {t("try.cueLabel")}
            </span>
            <textarea
              ref={field}
              rows={2}
              value={cue}
              disabled={phase === "armed"}
              onChange={(e) => {
                setCue(e.target.value);
                if (nudge) setNudge(null);
              }}
              placeholder={t("try.placeholder")}
              className="w-full resize-none rounded-[var(--r-control)] border border-line bg-bg-raised px-3.5 py-3 text-sm leading-snug outline-none transition-colors duration-150 placeholder:text-faint focus:border-accent-line disabled:opacity-50"
            />
          </label>

          {phase === "idle" && (
            <>
              <p className="mt-3 mb-2 text-[11px] text-faint">{t("try.pick")}</p>
              <div className="flex flex-wrap gap-2">
                {presets.map(([name, body]) => (
                  <button
                    key={name}
                    onClick={() => {
                      setCue(body);
                      setNudge(null);
                    }}
                    className="press rounded-[var(--r-pill)] border border-line px-3 py-1.5 text-xs text-muted hover:border-accent-line hover:text-fg"
                  >
                    {name}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-2">
                <span className="text-[11px] text-faint">{t("try.when")}</span>
                {CHOICES.map((n) => (
                  <button
                    key={n}
                    onClick={() => setSpan(n)}
                    className={`press tnum rounded-[var(--r-pill)] border px-3 py-1.5 font-mono text-xs ${
                      span === n
                        ? "border-accent-line bg-accent-dim text-fg"
                        : "border-line text-muted hover:bg-panel-hover"
                    }`}
                  >
                    {n < 60 ? `${n}s` : "1m"}
                  </button>
                ))}
              </div>
            </>
          )}

          <button
            onClick={phase === "armed" ? () => setPhase("idle") : start}
            className={`press mt-5 w-full rounded-[var(--r-control)] px-4 py-3 text-sm font-medium ${
              phase === "armed"
                ? "border border-line-strong text-fg hover:bg-panel-hover"
                : "bg-accent text-[#1a1206] hover:-translate-y-px"
            }`}
          >
            {phase === "armed" ? t("try.stop") : t("try.start")}
          </button>

          <p
            className={`mt-3 text-xs leading-relaxed ${
              nudge ? "notice-in text-accent" : "text-faint"
            }`}
            role={nudge ? "status" : undefined}
          >
            {nudge ?? t("try.foot")}
          </p>
        </>
      )}
    </div>
  );
}

/**
 * The countdown ring.
 *
 * A stroked circle whose dash offset tracks the time left, so the ring drains
 * instead of stepping. The transition is short enough that pressing stop feels
 * immediate, and long enough that the quarter-second poll does not read as a
 * stutter.
 */
function Dial({ value, label }: { value: number; label: string }) {
  const R = 62;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative mx-auto grid h-[168px] w-[168px] place-items-center">
      <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90">
        <circle cx="80" cy="80" r={R} fill="none" stroke="var(--line)" strokeWidth="3" />
        <circle
          cx="80"
          cy="80"
          r={R}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - value)}
          style={{ transition: "stroke-dashoffset 260ms linear" }}
        />
      </svg>
      <span className="display tnum font-mono text-[2.1rem] tracking-tight">
        {label}
      </span>
    </div>
  );
}
