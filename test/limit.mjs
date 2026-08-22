// Proof that the one endpoint which spends money has a ceiling on it.
// No credentials needed — the key below is deliberately invalid, and the runs
// it creates fail harmlessly when they fire.

const BASE = process.env.BASE ?? "https://cueline-delta.vercel.app";

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

const run = (n) => ({
  apiKey: "sk-ant-not-a-real-key-for-the-limit-test",
  cues: [`limit probe ${n}`],
  fireAt: new Date(Date.now() + 3 * 60_000).toISOString(),
});

console.log("\nA CEILING ON SCHEDULING");

const codes = [];
for (let i = 1; i <= 13; i++) codes.push((await post(run(i))).status);

console.log(`  codes: ${codes.join(" ")}`);
ok("the first request is accepted", codes[0] === 200);
ok("the burst is cut off", codes.includes(429));
ok(
  "and it is cut off within the stated ten",
  codes.filter((c) => c === 200).length <= 10,
  `${codes.filter((c) => c === 200).length} accepted`,
);
ok("everything after the cut is refused", codes.slice(codes.indexOf(429)).every((c) => c === 429));

const body = await (await post(run(99))).json();
ok("the refusal says why in plain words", /hour|day/i.test(body.error ?? ""), body.error);

console.log("\nBAD INPUT IS STILL REFUSED FIRST, NOT COUNTED");
const empty = await post({ apiKey: "x", cues: [], fireAt: new Date(Date.now() + 60_000).toISOString() });
ok("an empty queue is a 400, not a 429", empty.status === 400, String(empty.status));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
