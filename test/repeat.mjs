// The recurrence arithmetic, checked directly. No network, no key, no database.
// Run: node --experimental-strip-types test/repeat.mjs

import { nextFire } from "../lib/repeat.ts";

let pass = 0, fail = 0;
const ok = (n, c, d = "") => {
  (c ? pass++ : fail++);
  console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

// Jakarta is UTC+7 and keeps no daylight saving, so 06:00 local is 23:00 UTC
// the previous day — the exact case that reads as "weekend" to a naive server.
const WIB = 420;
const local = (iso) => new Date(iso).toISOString();

console.log("\nEVERY DAY");
{
  const from = "2026-08-24T23:00:00.000Z"; // Mon 06:00 WIB
  const now = Date.parse("2026-08-24T23:00:05.000Z");
  const n = nextFire(from, "daily", WIB, now);
  ok("lands the next day", local(n.toISOString()) === "2026-08-25T23:00:00.000Z", n.toISOString());
  ok("at the same clock time", n.toISOString().slice(11) === "23:00:00.000Z");
}
{
  // Fired eight seconds late; the schedule must not walk forward with it.
  const n = nextFire("2026-08-24T23:00:00.000Z", "daily", WIB, Date.parse("2026-08-24T23:00:08.000Z"));
  ok("lateness does not drift the schedule", n.toISOString().endsWith("23:00:00.000Z"), n.toISOString());
}
{
  // Three days of downtime: one next run, not a backlog of three.
  const n = nextFire("2026-08-24T23:00:00.000Z", "daily", WIB, Date.parse("2026-08-27T12:00:00.000Z"));
  ok("missed days are skipped, not queued", n.toISOString() === "2026-08-27T23:00:00.000Z", n.toISOString());
}

console.log("\nWEEKDAYS, IN THE READER'S WEEK");
{
  // Friday 06:00 WIB = Thursday 23:00 UTC. Next weekday is Monday morning.
  const from = "2026-08-27T23:00:00.000Z"; // Fri 28 Aug 06:00 WIB
  const n = nextFire(from, "weekdays", WIB, Date.parse("2026-08-27T23:00:05.000Z"));
  ok(
    "Friday jumps the weekend to Monday",
    n.toISOString() === "2026-08-30T23:00:00.000Z",
    `${n.toISOString()} = Mon 31 Aug 06:00 WIB`,
  );
}
{
  // The bug this offset exists to stop: judged in UTC, Sunday 23:00 looks like
  // a weekend and the run would be pushed a day past its Monday.
  const from = "2026-08-21T23:00:00.000Z"; // Sat 22 Aug 06:00 WIB
  const naive = nextFire(from, "weekdays", 0, Date.parse("2026-08-21T23:00:05.000Z"));
  const aware = nextFire(from, "weekdays", WIB, Date.parse("2026-08-21T23:00:05.000Z"));
  ok(
    "UTC alone would land it on the wrong day",
    naive.toISOString() !== aware.toISOString(),
    `utc ${naive.toISOString()} vs wib ${aware.toISOString()}`,
  );
  ok(
    "the reader gets Monday morning",
    aware.toISOString() === "2026-08-23T23:00:00.000Z",
    `${aware.toISOString()} = Mon 24 Aug 06:00 WIB`,
  );
}
{
  // A run sitting in the middle of the working week just moves one day.
  const n = nextFire("2026-08-25T23:00:00.000Z", "weekdays", WIB, Date.parse("2026-08-25T23:00:05.000Z"));
  ok("midweek moves one day", n.toISOString() === "2026-08-26T23:00:00.000Z", n.toISOString());
}
{
  // Downtime across a weekend still resolves to a weekday.
  const n = nextFire("2026-08-27T23:00:00.000Z", "weekdays", WIB, Date.parse("2026-09-01T02:00:00.000Z"));
  const day = new Date(n.getTime() + WIB * 60_000).getUTCDay();
  ok("after downtime it is still a weekday", day >= 1 && day <= 5, n.toISOString());
  ok("and it is in the future", n.getTime() > Date.parse("2026-09-01T02:00:00.000Z"));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
