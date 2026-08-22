import puppeteer from "puppeteer-core";

const BASE = "https://cueline-delta.vercel.app";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

let pass = 0;
let fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
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
  await page.setViewport({ width: 1280, height: 900 });

  const clickText = (label, exact = false) =>
    page.evaluate(
      ([l, e]) => {
        const b = [...document.querySelectorAll("button")].find((x) =>
          e ? x.textContent.trim() === l : new RegExp(l, "i").test(x.textContent),
        );
        b?.click();
        return Boolean(b);
      },
      [label, exact],
    );

  const text = () => page.evaluate(() => document.body.innerText);

  console.log("\nHERO DEMO — does the landing page actually do anything?");
  await page.goto(BASE, { waitUntil: "networkidle2" });

  const buttons = await page.$$eval("button", (bs) => bs.map((b) => b.textContent.trim()));
  ok("the demo renders", buttons.includes("Start the countdown"));

  await clickText("Start the countdown");
  await wait(400);
  const nudge = await page
    .$eval('[role="status"]', (e) => e.textContent.trim())
    .catch(() => "");
  ok("an empty cue is refused", /Write a cue first/i.test(nudge), nudge);

  await clickText("Morning brief");
  const filled = await page.$eval("textarea", (e) => e.value);
  ok("a preset fills the field", filled.length > 10, `"${filled.slice(0, 38)}…"`);

  await page.click("textarea", { clickCount: 3 });
  await page.type("textarea", "Ring me when the build is green.");
  ok(
    "the cue is editable",
    (await page.$eval("textarea", (e) => e.value)) === "Ring me when the build is green.",
  );

  await clickText("10s", true);
  await clickText("Start the countdown");
  await wait(1200);
  const t1 = await page.$eval(".display", (e) => e.textContent.trim());
  await wait(2500);
  const t2 = await page.$eval(".display", (e) => e.textContent.trim());
  ok("the countdown actually runs", /^00:\d\d$/.test(t1) && t1 !== t2, `${t1} -> ${t2}`);

  const dash = await page.$$eval("svg circle", (cs) =>
    cs.map((c) => c.getAttribute("stroke-dashoffset")).filter(Boolean),
  );
  ok(
    "the ring drains with it",
    dash.length > 0 && Number(dash[0]) > 0,
    `offset ${Number(dash[0]).toFixed(1)}`,
  );

  await wait(8000);
  const landed = await text();
  ok(
    "the cue lands and comes back",
    /This is the moment it lands/i.test(landed) &&
      /Ring me when the build is green/.test(landed),
  );

  const carry = await page.$$eval("a", (as) =>
    as.map((a) => a.getAttribute("href")).filter((h) => h && h.includes("/console?cue=")),
  );
  ok("it can be carried onward", carry.length === 1, carry[0]?.slice(0, 55));

  await page.goto(BASE + carry[0], { waitUntil: "networkidle2" });
  await wait(1400);
  ok("the console adopts the carried cue", /Ring me when the build is green/.test(await text()));
  ok("and tidies the query string", page.url().endsWith("/console"), page.url());

  console.log("\nCOST DIAL — can a reader price their own usage?");
  await page.goto(BASE + "/#cost", { waitUntil: "networkidle2" });
  await wait(700);

  ok("two sliders render", (await page.$$("input.dial")).length === 2);

  const figure = () =>
    page.$$eval(".display", (es) => es.map((e) => e.textContent.trim()).pop());

  const before = await figure();
  await page.evaluate(() => {
    const s = document.querySelectorAll("input.dial")[0];
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(s, "12");
    s.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await wait(400);
  const after = await figure();
  ok("the figure follows the slider", before !== after, `${before} -> ${after}`);
  ok("and reads as money", /^\$/.test(after) || /¢$/.test(after), after);

  console.log("\nSTILL TRUE — what was already working");

  // Click ID by exact name. Reaching for the first of the pair lands on EN,
  // which is already active, so the page correctly does nothing.
  ok("the ID button is there", await clickText("ID", true));
  await wait(900);
  const id = await text();
  ok(
    "Indonesian reaches the new demo",
    /coba di sini/i.test(id) && /Mulai hitung mundur/.test(id),
  );
  ok("and the new cost dial", /per bulan/i.test(id));

  await clickText("EN", true);
  await wait(900);
  ok("English comes back", /try it here/i.test(await text()));

  await page.setViewport({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: "networkidle2" });
  ok(
    "no sideways scroll at 390px",
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  );

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await wait(1200);
  ok(
    "scroll reveals still fire",
    await page.evaluate(() =>
      [...document.querySelectorAll(".reveal")].some((e) => e.dataset.shown === "true"),
    ),
  );
} finally {
  await browser.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
