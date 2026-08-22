// One sample proves the wiring. A distribution proves the promise.
// Books a run every 20 minutes for three hours and records how late each
// one actually fired. The key is fake, so no tokens are ever spent.

import { appendFileSync } from "node:fs";

const BASE = "https://cueline-delta.vercel.app";
const LOG = "lateness.log";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (l) => { console.log(l); appendFileSync(LOG, l + "\n"); };

const results = [];

for (let n = 1; n <= 9; n++) {
  const fireAt = new Date(Date.now() + 90_000);
  const r = await fetch(BASE + "/api/schedule", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      apiKey: "sk-ant-api03-LATENESS-PROBE-NOT-A-REAL-KEY",
      cues: ["probe"],
      fireAt: fireAt.toISOString(),
    }),
  });
  const booked = await r.json();
  if (!r.ok) { say(`probe ${n}: could not book — ${JSON.stringify(booked)}`); continue; }

  let row, giveUp = Date.now() + 12 * 60_000;
  do {
    await wait(10_000);
    row = await (await fetch(`${BASE}/api/schedule/${booked.handle}`)).json();
  } while (row.status === "waiting" && Date.now() < giveUp);

  if (row.status === "waiting") {
    say(`probe ${n}  due ${fireAt.toISOString().slice(11,19)}Z  NEVER FIRED within 12m`);
    results.push(null);
  } else {
    const late = Math.round((new Date(row.settled_at) - fireAt) / 1000);
    results.push(late);
    say(`probe ${n}  due ${fireAt.toISOString().slice(11,19)}Z  fired +${late}s`);
  }
  if (n < 9) await wait(20 * 60_000 - 3 * 60_000);
}

const good = results.filter((v) => v !== null);
say("");
say(`${good.length}/${results.length} fired.  best +${Math.min(...good)}s  worst +${Math.max(...good)}s  median +${good.sort((a,b)=>a-b)[Math.floor(good.length/2)]}s`);
