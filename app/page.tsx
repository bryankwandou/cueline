"use client";

import Link from "next/link";
import { Mark, Wordmark } from "@/components/logo";
import { LiveClock } from "@/components/live-clock";
import { LangToggle } from "@/components/lang-toggle";
import { useT } from "@/lib/i18n";

export default function Landing() {
  return (
    <div className="relative z-10">
      <Nav />
      <Hero />
      <Problem />
      <Steps />
      <KeyStory />
      <Cost />
      <Limits />
      <Footer />
    </div>
  );
}

function Nav() {
  const t = useT();
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Wordmark size={26} />
        <nav className="flex items-center gap-5 text-sm sm:gap-7">
          <a
            href="#how"
            className="hidden text-muted transition-colors duration-150 hover:text-fg sm:block"
          >
            {t("nav.how")}
          </a>
          <a
            href="#key"
            className="hidden text-muted transition-colors duration-150 hover:text-fg sm:block"
          >
            {t("nav.key")}
          </a>
          <a
            href="#cost"
            className="hidden text-muted transition-colors duration-150 hover:text-fg sm:block"
          >
            {t("nav.cost")}
          </a>
          <LangToggle />
          <Link
            href="/console"
            className="rounded-[var(--r-control)] bg-fg px-4 py-2 font-medium text-bg transition-opacity duration-150 hover:opacity-85"
          >
            {t("nav.console")}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  const t = useT();
  return (
    <section className="mx-auto max-w-6xl px-6 pt-24 pb-28 sm:pt-32">
      <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rise">
          <div className="mb-7 inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-line bg-panel px-3 py-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {t("hero.badge")}
          </div>

          <h1
            className="text-[2.75rem] leading-[1.05] font-semibold text-balance sm:text-6xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            {t("hero.h1a")}
            <br />
            {t("hero.h1b")}
            <br />
            <span className="text-accent">{t("hero.h1c")}</span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
            {t("hero.sub")}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/console"
              className="rounded-[var(--r-control)] bg-accent px-6 py-3 font-medium text-[#1a1206] transition-transform duration-150 hover:-translate-y-px"
            >
              {t("hero.cta")}
            </Link>
            <a
              href="#key"
              className="rounded-[var(--r-control)] border border-line-strong px-6 py-3 font-medium text-fg transition-colors duration-150 hover:bg-panel"
            >
              {t("hero.cta2")}
            </a>
          </div>

          <p className="mt-6 text-sm text-faint">{t("hero.note")}</p>
        </div>

        <TimerCard />
      </div>
    </section>
  );
}

function TimerCard() {
  const t = useT();
  return (
    <div className="rise rounded-[var(--r-hero)] border border-line bg-panel p-7 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <span className="text-xs tracking-wide text-faint uppercase">
          {t("card.next")}
        </span>
        <span className="flex items-center gap-2 text-xs text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {t("card.armed")}
        </span>
      </div>

      <div className="py-9">
        <LiveClock />
        <p className="mt-3 text-center text-xs text-faint">
          {t("card.counting")}
        </p>
      </div>

      <div className="space-y-2.5">
        {(["card.cue1", "card.cue2", "card.cue3"] as const).map((k, i) => (
          <div
            key={k}
            className="flex items-start gap-3 rounded-[var(--r-control)] border border-line bg-bg-raised px-4 py-3"
          >
            <span className="tnum mt-0.5 font-mono text-xs text-faint">
              0{i + 1}
            </span>
            <span className="text-sm leading-snug text-muted">{t(k)}</span>
          </div>
        ))}
      </div>

      <p className="mt-5 text-xs text-faint">{t("card.foot")}</p>
    </div>
  );
}

function Problem() {
  const t = useT();
  const [line1, line2] = t("problem.h").split("\n");
  return (
    <section className="border-y border-line bg-bg-raised/40">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <h2
            className="text-3xl leading-tight font-semibold text-balance sm:text-4xl"
            style={{ letterSpacing: "-0.03em" }}
          >
            {line1}
            <br />
            {line2}
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-muted">
            <p>{t("problem.p1")}</p>
            <p>{t("problem.p2")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const t = useT();
  const steps = [
    { n: "01", t: t("steps.1t"), d: t("steps.1d") },
    { n: "02", t: t("steps.2t"), d: t("steps.2d") },
    { n: "03", t: t("steps.3t"), d: t("steps.3d") },
  ];

  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-24">
      <h2
        className="text-3xl font-semibold sm:text-4xl"
        style={{ letterSpacing: "-0.03em" }}
      >
        {t("steps.h")}
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-muted">{t("steps.sub")}</p>

      {/* A rail, not a three-up card grid: the product is a queue on a
          timeline, so the layout is the same shape as the thing it sells.
          Each step indents further and narrows, so the eye falls down the
          line instead of scanning across equal boxes. */}
      <ol className="relative mt-16 ml-3 border-l border-line pl-9 sm:ml-6 sm:pl-12">
        {steps.map((s, i) => (
          <li
            key={s.n}
            className="relative pb-14 last:pb-0"
            style={{ marginLeft: `${i * 1.75}rem` }}
          >
            <span
              className="absolute top-1.5 h-2.5 w-2.5 rounded-full bg-accent"
              style={{ left: "calc(-2.25rem - 5px)" }}
              aria-hidden="true"
            />
            <span className="tnum font-mono text-sm text-accent">{s.n}</span>
            <h3
              className="mt-2 text-2xl font-medium"
              style={{ letterSpacing: "-0.025em" }}
            >
              {s.t}
            </h3>
            <p
              className="mt-3 leading-relaxed text-muted"
              style={{ maxWidth: `${34 - i * 3}rem` }}
            >
              {s.d}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function KeyStory() {
  const t = useT();
  const rows: [string, string, boolean][] = [
    ["browser", t("key.r1"), true],
    ["/api/run", t("key.r2"), true],
    ["anthropic", t("key.r3"), true],
    ["database", t("key.r4"), false],
  ];

  return (
    <section id="key" className="border-y border-line bg-bg-raised/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-14 lg:grid-cols-2">
          <div>
            <h2
              className="text-3xl font-semibold sm:text-4xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              {t("key.h")}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              {t("key.p1")}
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              {t("key.p2")}
            </p>
          </div>

          <div className="rounded-[var(--r-panel)] border border-line bg-panel p-7">
            <div className="space-y-4 font-mono text-sm">
              {rows.map(([where, what, live]) => (
                <div
                  key={where}
                  className="flex items-center justify-between gap-4 border-b border-line pb-4 last:border-0 last:pb-0"
                >
                  <span className={live ? "text-fg" : "text-faint line-through"}>
                    {where}
                  </span>
                  <span
                    className={`text-right ${live ? "text-muted" : "text-faint"}`}
                  >
                    {what}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs leading-relaxed text-faint">
              {t("key.note")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Cost() {
  const t = useT();
  const rows = [
    [t("cost.r1"), "~600 tokens", "$0.0004"],
    [t("cost.r2"), "~2,400 tokens", "$0.0016"],
    [t("cost.r3"), "~52,000 tokens", "$0.035"],
  ];

  return (
    <section id="cost" className="overflow-hidden py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2
          className="text-3xl font-semibold sm:text-4xl"
          style={{ letterSpacing: "-0.03em" }}
        >
          {t("cost.h")}
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-muted">{t("cost.sub")}</p>
      </div>

      {/* The one full-width band on the page. Numbers are the argument here,
          so they get the whole horizon instead of another bordered box. */}
      <div className="bleed mt-14 border-y border-line bg-bg-raised/40">
        <div className="mx-auto max-w-5xl overflow-x-auto px-6">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="text-xs tracking-wide text-faint uppercase">
                <th className="py-5 font-normal">{t("cost.th1")}</th>
                <th className="py-5 font-normal">{t("cost.th2")}</th>
                <th className="py-5 text-right font-normal">{t("cost.th3")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([a, b, c]) => (
                <tr key={a} className="border-t border-line">
                  <td className="py-6 text-lg">{a}</td>
                  <td className="tnum py-6 font-mono text-sm text-muted">{b}</td>
                  <td className="tnum py-6 text-right font-mono text-2xl text-accent">
                    {c}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Limits() {
  const t = useT();
  const items = [
    [t("limits.1t"), t("limits.1d")],
    [t("limits.2t"), t("limits.2d")],
    [t("limits.3t"), t("limits.3d")],
  ];

  return (
    <section className="border-t border-line bg-bg-raised/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <h2
          className="text-3xl font-semibold sm:text-4xl"
          style={{ letterSpacing: "-0.03em" }}
        >
          {t("limits.h")}
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-muted">{t("limits.sub")}</p>

        {/* Deliberately not cards. These are admissions, and putting each one
            in its own tidy box makes them read as features. A plain divided
            list reads as a list of facts, which is what they are. */}
        <dl className="mt-12 max-w-3xl">
          {items.map(([title, body]) => (
            <div
              key={title}
              className="grid gap-2 border-t border-line py-7 last:border-b sm:grid-cols-[1fr_1.4fr] sm:gap-10"
            >
              <dt className="font-medium">{title}</dt>
              <dd className="m-0 leading-relaxed text-muted">{body}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-14 flex flex-wrap items-center gap-4">
          <Link
            href="/console"
            className="rounded-[var(--r-control)] bg-accent px-6 py-3 font-medium text-[#1a1206] transition-transform duration-150 hover:-translate-y-px"
          >
            {t("limits.cta")}
          </Link>
          <span className="text-sm text-faint">{t("limits.note")}</span>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const t = useT();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Mark size={22} />
          <span className="text-sm text-muted">{t("footer.tag")}</span>
        </div>
        <a
          href="https://github.com/bryankwandou/cueline"
          className="text-sm text-faint transition-colors duration-150 hover:text-fg"
        >
          {t("footer.src")}
        </a>
      </div>
    </footer>
  );
}
