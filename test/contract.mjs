// Everything here goes through the public API. No credentials, no database
// handle, nothing that only the author could run — the point is that a judge
// can paste this file and get the same answers.

const BASE = process.env.BASE ?? "https://cueline-delta.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (n, c, d = "") => {
  c ? pass++ : fail++;
  console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

const post = async (body) => {
  const res = await fetch(BASE + "/api/schedule", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  // A 429 here is the limiter doing its job, not the contract breaking. It
  // happens when limit.mjs ran from this address inside the last hour. Saying
  // so beats fifteen confusing failures.
  if (res.status === 429) {
    console.log(
      "\n  STOPPED  this address is inside its scheduling allowance." +
        "\n           That is test/limit.mjs working. Wait an hour and run this again.",
    );
    process.exit(2);
  }
  return res;
};

const FAKE = "sk-ant-api03-CONTRACT-PROBE-NOT-A-REAL-KEY";
const good = () => ({
  apiKey: FAKE,
  cues: ["probe"],
  fireAt: new Date(Date.now() + 6e5).toISOString(),
});

console.log("\nWHAT THE DOOR REFUSES");
for (const [name, body, want] of [
  ["a run with no key", { ...good(), apiKey: "" }, /needs a key/i],
  ["an empty queue", { ...good(), cues: [] }, /empty/i],
  ["a time already behind us", { ...good(), fireAt: new Date(Date.now() - 6e5).toISOString() }, /behind us/i],
  ["a time that is not a time", { ...good(), fireAt: "someday" }, /did not parse/i],
  ["a thirteenth cue", { ...good(), cues: Array(13).fill("x") }, /twelve/i],
]) {
  const r = await post(body);
  const j = await r.json();
  ok(name, r.status === 400 && want.test(j.error ?? ""), j.error);
}

const bad = await fetch(BASE + "/api/schedule", { method: "POST", body: "{oops" });
ok("a body that is not JSON", bad.status === 400, `${bad.status}`);

const tick = await fetch(BASE + "/api/tick");
ok("a tick with no secret", tick.status === 401, `${tick.status}`);

const missing = await fetch(BASE + "/api/schedule/definitely-not-a-real-handle");
ok("a handle nobody issued", missing.status === 404, `${missing.status}`);

console.log("\nWHAT BECOMES OF THE KEY");

// Far enough out that it is still waiting when we look, close enough that
// the shift picks it up inside this test.
const booked = await (await post({ ...good(), fireAt: new Date(Date.now() + 45_000).toISOString() })).json();
ok("a well-formed run is accepted", Boolean(booked.handle), booked.handle);
ok("the handle is not worth guessing", booked.handle.length >= 24, `${booked.handle.length} url-safe chars`);

const look = async () => (await fetch(`${BASE}/api/schedule/${booked.handle}`)).json();
const waiting = await look();
ok("the key never comes back out", !JSON.stringify(waiting).includes(FAKE) && !("sealed_key" in waiting));
ok("but the row admits it is holding one", waiting.key_held === true);

let row = waiting;
const giveUp = Date.now() + 5 * 6e4;
while (row.status === "waiting" && Date.now() < giveUp) {
  await wait(10_000);
  row = await look();
}
ok("the run settles with nobody watching", row.status !== "waiting", row.status);
ok("and the key is gone from the row", row.key_held === false, `key_held is ${row.key_held}`);
ok(
  "what came back is Anthropic's own answer",
  /authentication_error/.test(JSON.stringify(row.results)),
  JSON.stringify(row.results?.[0]?.error ?? "").slice(0, 76),
);

console.log("\nCALLING ONE OFF");
const cancel = await (await post(good())).json();
const shred = await fetch(`${BASE}/api/schedule/${cancel.handle}`, { method: "DELETE" });
ok("a waiting run can be shredded", shred.ok);
ok("and afterwards there is nothing to read", (await fetch(`${BASE}/api/schedule/${cancel.handle}`)).status === 404);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
