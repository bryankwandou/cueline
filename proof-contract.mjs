// Runs from inside the project so it can reach both the live API and the
// actual database, and check that what the API refuses to show is also
// genuinely not there.

import "./loadenv.mjs";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const BASE = "https://cueline-delta.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (n, c, d = "") => {
  (c ? pass++ : fail++);
  console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

const post = (body) =>
  fetch(BASE + "/api/schedule", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const FAKE = "sk-ant-api03-CONTRACT-PROBE-NOT-A-REAL-KEY";
const good = { apiKey: FAKE, cues: ["probe"], fireAt: new Date(Date.now() + 6e5).toISOString() };

console.log("\nWHAT THE DOOR REFUSES");
for (const [name, body, want] of [
  ["a run with no key", { ...good, apiKey: "" }, /needs a key/i],
  ["an empty queue", { ...good, cues: [] }, /empty/i],
  ["a time already past", { ...good, fireAt: new Date(Date.now() - 6e5).toISOString() }, /behind us/i],
  ["a time that is not a time", { ...good, fireAt: "someday" }, /did not parse/i],
  ["more than twelve cues", { ...good, cues: Array(13).fill("x") }, /twelve/i],
]) {
  const r = await post(body);
  const j = await r.json();
  ok(name, r.status === 400 && want.test(j.error ?? ""), j.error);
}

const bad = await fetch(BASE + "/api/schedule", { method: "POST", body: "{oops" });
ok("a body that is not JSON", bad.status === 400);

const tick = await fetch(BASE + "/api/tick");
ok("a tick with no secret", tick.status === 401, `${tick.status}`);

const missing = await fetch(BASE + "/api/schedule/definitely-not-a-real-handle");
ok("a handle nobody issued", missing.status === 404);

console.log("\nWHAT THE KEY DOES NEXT");

const booked = await (await post(good)).json();
ok("a good run is accepted", Boolean(booked.handle), booked.handle);
ok("the handle is not guessable", booked.handle.length >= 24, `${booked.handle.length} url-safe chars`);

const read = await (await fetch(`${BASE}/api/schedule/${booked.handle}`)).json();
const asText = JSON.stringify(read);
ok("the API never hands the key back", !asText.includes(FAKE) && !("sealed_key" in read));

const [row] = await sql`SELECT sealed_key FROM runs WHERE handle = ${booked.handle}`;
ok("and the database does not hold it in the clear", !row.sealed_key.includes(FAKE));
ok(
  "it is sealed as iv.tag.ciphertext",
  row.sealed_key.split(".").length === 3,
  row.sealed_key.slice(0, 30) + "…",
);

console.log("\nWHAT HAPPENS WHEN IT IS OVER");

// Pull it forward so the running shift picks it up within half a minute.
await sql`UPDATE runs SET fire_at = now() WHERE handle = ${booked.handle}`;
let after, giveUp = Date.now() + 5 * 6e4;
do {
  await wait(10_000);
  [after] = await sql`SELECT status, sealed_key FROM runs WHERE handle = ${booked.handle}`;
} while (after.status === "waiting" && Date.now() < giveUp);

ok("the run settles unattended", after.status !== "waiting", after.status);
ok("and the key is wiped from the row", after.sealed_key === "", `sealed_key is ${JSON.stringify(after.sealed_key)}`);

const gone = await fetch(`${BASE}/api/schedule/${booked.handle}`, { method: "DELETE" });
ok("a run can be shredded on request", gone.ok);
const [{ count }] = await sql`SELECT count(*)::int FROM runs WHERE handle = ${booked.handle}`;
ok("and the row is really gone", count === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
