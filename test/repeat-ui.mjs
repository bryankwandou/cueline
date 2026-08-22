import puppeteer from "puppeteer-core";
const BASE = "https://cueline-delta.vercel.app";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { (c ? pass++ : fail++); console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  await page.goto(BASE + "/console", { waitUntil: "networkidle2" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + "/console", { waitUntil: "networkidle2" });
  await wait(1200);

  const labels = () => page.$$eval("[data-repeat] button", (bs) => bs.map((b) => b.textContent.trim()));
  const pressed = () => page.$$eval("[data-repeat] button", (bs) => bs.map((b) => b.getAttribute("aria-pressed")));

  console.log("\nTHE REPEAT CONTROL");
  const l = await labels();
  ok("three choices are offered", l.length === 3, l.join(" / "));
  ok("once is the default", (await pressed())[0] === "true", (await pressed()).join(","));

  await page.evaluate(() => document.querySelectorAll("[data-repeat] button")[1].click());
  await wait(300);
  ok("daily can be chosen", (await pressed())[1] === "true", (await pressed()).join(","));
  ok("and only one is chosen at a time", (await pressed()).filter((p) => p === "true").length === 1);

  await page.evaluate(() => document.querySelectorAll("[data-repeat] button")[2].click());
  await wait(300);
  ok("weekdays can be chosen", (await pressed())[2] === "true");

  const body = await page.evaluate(() => document.body.innerText);
  ok("the key cost of repeating is stated beside it", /key/i.test(body) && /repeat|every day|weekday/i.test(body));

  console.log("\nIN INDONESIAN");
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "ID")?.click());
  await wait(900);
  const idl = await labels();
  ok("the control is translated", idl.some((x) => /Setiap hari|Hari kerja|Sekali/.test(x)), idl.join(" / "));
} finally { await browser.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
