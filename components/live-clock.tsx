"use client";

import { useEffect, useState } from "react";

/**
 * A real countdown on the marketing page, not a screenshot of one.
 *
 * It counts to the next 07:00 local — the hour the product exists for — so
 * the number a visitor sees is their own morning, and it is different for
 * every person who loads the page. Static mockups of clocks read as stock
 * art; a clock that is actually running does not.
 */
function untilNextBrief(): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(7, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return Math.floor((target.getTime() - now.getTime()) / 1000);
}

export function LiveClock() {
  // Server and client disagree about the time, so hold zeros until mount.
  const [secs, setSecs] = useState<number | null>(null);

  useEffect(() => {
    setSecs(untilNextBrief());
    const t = setInterval(() => setSecs(untilNextBrief()), 1000);
    return () => clearInterval(t);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  const h = secs === null ? "--" : pad(Math.floor(secs / 3600));
  const m = secs === null ? "--" : pad(Math.floor((secs % 3600) / 60));
  const s = secs === null ? "--" : pad(secs % 60);

  return (
    <div className="tnum flex items-baseline justify-center gap-1.5 font-mono text-5xl font-medium sm:text-6xl">
      <span>{h}</span>
      <span className="text-faint">:</span>
      <span>{m}</span>
      <span className="text-faint">:</span>
      <span className="text-accent tabular-nums">{s}</span>
    </div>
  );
}
