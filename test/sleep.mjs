import puppeteer from "puppeteer-core";

// Reproduces what a sleeping laptop does to the console: the deadline is set,
// the page goes away, and the page comes back. A reload is the closest honest
// stand-in for a discarded tab — same outcome, same code path on restore.

const BASE = "https://cueline-delta.vercel.app";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

let pass = 0;
let fail = 0;
const ok = (n, c, d = "") => {
  if (c) {
    pass++;
    console.log(`  PASS  ${n}${d ? ` — ${d}` : ""}`);
  } else {
    fail++;
    console.log(`  FAIL  ${n}${d ? ` — ${d}` : ""}`);
  }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  const clock = () =>
    page.$eval("[data-clock]", (e) => e.textContent.replace(/\s+/g, ""));
  const text = () => page.evaluate(() => document.body.innerText);
  const armedNow = () => page.evaluate(() => localStorage.getItem("cueline:armed"));

  console.log("\nA COUNTDOWN THAT OUTLIVES ITS TAB");

  await page.goto(BASE + "/console", { waitUntil: "networkidle2" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + "/console", { waitUntil: "networkidle2" });
  await wait(900);

  // Reminder mode needs no key, which keeps this test from spending anything.
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => /Just remind me/i.test(b.textContent))
      ?.click();
  });
  await page.type("textarea", "Wake the queue after a nap.");
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Add")?.click();
  });
  await wait(400);

  // Two minutes out, so the deadline is still ahead after the reload.
  await page.evaluate(() => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    ).set;
    const mins = [...document.querySelectorAll("input")].find(
      (i) => i.type === "number" && i.closest("label")?.innerText.match(/minutes/i),
    );
    setter.call(mins, "2");
    mins.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await wait(300);
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => /Arm the queue/i.test(b.textContent))
      ?.click();
  });
  await wait(1200);

  const before = await clock();
  ok("the countdown arms", /^\d\d:\d\d:\d\d$/.test(before), before);
  ok("the deadline is written down", (await armedNow()) === "true");
  const storedTarget = await page.evaluate(() => localStorage.getItem("cueline:fireAt"));
  ok("and so is the target", storedTarget && storedTarget !== "null", storedTarget);

  // The nap.
  await wait(4000);
  await page.reload({ waitUntil: "networkidle2" });
  await wait(1500);

  const after = await clock();
  ok("it is still armed after the reload", (await armedNow()) === "true");
  ok("the clock survived", /^\d\d:\d\d:\d\d$/.test(after) && after !== "00:00:00", after);

  const [bs, as] = [before, after].map((v) => {
    const [h, m, s] = v.split(":").map(Number);
    return h * 3600 + m * 60 + s;
  });
  ok(
    "and it kept counting while the page was gone",
    bs - as >= 3 && bs - as <= 12,
    `${before} -> ${after}, ${bs - as}s elapsed`,
  );

  ok("the cue is still in the queue", /Wake the queue after a nap/.test(await text()));

  console.log("\nA DEADLINE MISSED BY TOO MUCH");

  // Push the stored target far into the past, then come back.
  await page.evaluate(() => {
    localStorage.setItem("cueline:fireAt", String(Date.now() - 3 * 60 * 60 * 1000));
    localStorage.setItem("cueline:armed", "true");
  });
  await page.reload({ waitUntil: "networkidle2" });
  await wait(1500);

  const stale = await text();
  ok("a long-stale run is stood down", (await armedNow()) === "false");
  ok(
    "and says so instead of firing",
    /was due/i.test(stale) && /3 hours/i.test(stale),
    stale.split("\n").find((l) => /was due/i.test(l))?.slice(0, 90),
  );
  ok("the queue is still intact", /Wake the queue after a nap/.test(stale));
} finally {
  await browser.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
