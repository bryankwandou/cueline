// Does a repeating run actually put its successor in the table?
const BASE = "https://cueline-delta.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const body = {
  apiKey: "sk-ant-deliberately-invalid-chain-probe",
  cues: ["chain probe"],
  fireAt: new Date(Date.now() + 2 * 60_000).toISOString(),
  repeat: "daily",
  tzOffset: 420,
};

let res, out;
for (;;) {
  res = await fetch(BASE + "/api/schedule", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  out = await res.json();
  if (res.status !== 429) break;
  console.log(`[${new Date().toISOString()}] still rate limited, waiting 5 min`);
  await wait(5 * 60_000);
  body.fireAt = new Date(Date.now() + 2 * 60_000).toISOString();
}
console.log("scheduled:", res.status, JSON.stringify(out));
if (!out.handle) process.exit(1);

for (let i = 0; i < 80; i++) {
  await wait(20_000);
  const s = await (await fetch(`${BASE}/api/schedule/${out.handle}`)).json();
  console.log(`[${new Date().toISOString()}] status=${s.status} key_held=${s.key_held} next=${s.next_handle ?? "-"}`);
  if (s.status === "done" || s.status === "failed") {
    if (!s.next_handle) { console.log("NO SUCCESSOR — chain broken"); process.exit(1); }
    const n = await (await fetch(`${BASE}/api/schedule/${s.next_handle}`)).json();
    console.log("successor:", JSON.stringify(n));
    const gap = (Date.parse(n.fireAt ?? n.fire_at) - Date.parse(out.fireAt)) / 3600_000;
    console.log(`gap from the original: ${gap.toFixed(2)} hours`);
    console.log(gap > 23.9 && gap < 24.1 ? "CHAIN OK — successor is one day later" : "CHAIN GAP WRONG");
    process.exit(0);
  }
}
console.log("never settled inside the window");
process.exit(1);
