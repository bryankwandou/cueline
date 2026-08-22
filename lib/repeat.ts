/**
 * When a repeating run should land next.
 *
 * Counted from the time it was *due*, not the time it finished, so a run that
 * fired eight seconds late does not walk its own schedule forward eight
 * seconds a day. If the server was down long enough to miss several turns,
 * the loop skips the missed ones rather than firing a backlog at once —
 * nobody wants four days of morning briefs arriving together.
 *
 * The weekend has to be decided in the reader's own week, not in UTC. A brief
 * set for six on Monday morning in Jakarta is Sunday at 23:00 UTC — judged by
 * the server's calendar that is a weekend, and a weekday run would be shoved a
 * day late, every week. So the run carries the offset it was made under and
 * the day is read through it.
 */
export function nextFire(from: string, rule: string, offsetMin = 0, now = Date.now()): Date {
  const at = new Date(from);
  /** The day of the week as the reader would say it. */
  const localDay = (d: Date) => new Date(d.getTime() + offsetMin * 60_000).getUTCDay();
  do {
    at.setUTCDate(at.getUTCDate() + 1);
    if (rule === "weekdays") {
      while (localDay(at) === 0 || localDay(at) === 6) at.setUTCDate(at.getUTCDate() + 1);
    }
  } while (at.getTime() <= now);
  return at;
}
