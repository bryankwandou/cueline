import Link from "next/link";
import { Mark, Wordmark } from "@/components/logo";

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
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Wordmark size={26} />
        <nav className="flex items-center gap-7 text-sm">
          <a
            href="#how"
            className="hidden text-muted transition-colors duration-150 hover:text-fg sm:block"
          >
            How it runs
          </a>
          <a
            href="#key"
            className="hidden text-muted transition-colors duration-150 hover:text-fg sm:block"
          >
            Your key
          </a>
          <a
            href="#cost"
            className="hidden text-muted transition-colors duration-150 hover:text-fg sm:block"
          >
            Cost
          </a>
          <Link
            href="/console"
            className="rounded-[10px] bg-fg px-4 py-2 font-medium text-bg transition-opacity duration-150 hover:opacity-85"
          >
            Open console
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-24 pb-28 sm:pt-32">
      <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rise">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Runs on Claude Haiku 4.5
          </div>

          <h1
            className="text-[2.75rem] leading-[1.05] font-semibold text-balance sm:text-6xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            Your prompts fire
            <br />
            while you&rsquo;re still
            <br />
            <span className="text-accent">stuck in traffic.</span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
            You send roughly the same three prompts every morning. Write them
            once, put a clock on them, and read the answers when you sit down.
            Nobody has to type at a red light.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/console"
              className="rounded-[10px] bg-accent px-6 py-3 font-medium text-[#1a1206] transition-transform duration-150 hover:-translate-y-px"
            >
              Queue your first cue
            </Link>
            <a
              href="#key"
              className="rounded-[10px] border border-line-strong px-6 py-3 font-medium text-fg transition-colors duration-150 hover:bg-panel"
            >
              Where does my key go?
            </a>
          </div>

          <p className="mt-6 text-sm text-faint">
            No account. Nothing to install. Bring your own Anthropic key.
          </p>
        </div>

        <TimerCard />
      </div>
    </section>
  );
}

function TimerCard() {
  return (
    <div className="rise rounded-[14px] border border-line bg-panel p-7 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <span className="text-xs tracking-wide text-faint uppercase">
          Next fire
        </span>
        <span className="flex items-center gap-2 text-xs text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Armed
        </span>
      </div>

      <div className="tnum flex items-baseline justify-center gap-1.5 py-9 font-mono text-5xl font-medium sm:text-6xl">
        <span>06</span>
        <span className="text-faint">:</span>
        <span>42</span>
        <span className="text-faint">:</span>
        <span className="text-accent">05</span>
      </div>

      <div className="space-y-2.5">
        {[
          "Summarise everything in #standup since 6pm",
          "Three risks in the Q3 forecast, one line each",
          "What did I say I'd finish today?",
        ].map((line, i) => (
          <div
            key={line}
            className="flex items-start gap-3 rounded-[10px] border border-line bg-bg-raised px-4 py-3"
          >
            <span className="tnum mt-0.5 font-mono text-xs text-faint">
              0{i + 1}
            </span>
            <span className="text-sm leading-snug text-muted">{line}</span>
          </div>
        ))}
      </div>

      <p className="mt-5 text-xs text-faint">
        Three cues, sent in order, roughly a tenth of a cent.
      </p>
    </div>
  );
}

function Problem() {
  return (
    <section className="border-y border-line bg-bg-raised/40">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <h2
            className="text-3xl leading-tight font-semibold text-balance sm:text-4xl"
            style={{ letterSpacing: "-0.03em" }}
          >
            The work is scheduled.
            <br />
            The typing isn&rsquo;t.
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-muted">
            <p>
              The morning brief lands at 07:00 whether or not you are at a desk.
              So people type it out on a phone, in a car, on a train — or they
              skip it and lose the thread for a day.
            </p>
            <p>
              The prompt was never the hard part. The hard part is that you have
              to be somewhere specific, holding something, at a particular
              minute. Cueline moves that minute off your shoulders and onto a
              clock.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const steps = [
    {
      n: "01",
      t: "Paste your key",
      d: "An Anthropic API key from the Console. It is stored in this browser and nowhere else — no account to make, no password to forget.",
    },
    {
      n: "02",
      t: "Write your cues",
      d: "The prompts you'd otherwise type by hand. Add as many as you want; they run top to bottom, one after another.",
    },
    {
      n: "03",
      t: "Set the clock and walk away",
      d: "Hours, minutes, seconds. When it hits zero the queue runs and the replies are waiting when you come back to the tab.",
    },
  ];

  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-24">
      <h2
        className="text-3xl font-semibold sm:text-4xl"
        style={{ letterSpacing: "-0.03em" }}
      >
        Three things, then nothing
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Setup takes about as long as sending one prompt manually. After that you
        stop thinking about it.
      </p>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.n}
            className="rounded-[14px] border border-line bg-panel p-7 transition-colors duration-150 hover:bg-panel-hover"
          >
            <span className="tnum font-mono text-sm text-accent">{s.n}</span>
            <h3 className="mt-4 text-lg font-medium">{s.t}</h3>
            <p className="mt-3 leading-relaxed text-muted">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function KeyStory() {
  return (
    <section id="key" className="border-y border-line bg-bg-raised/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-14 lg:grid-cols-2">
          <div>
            <h2
              className="text-3xl font-semibold sm:text-4xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              Your key never sleeps here
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              There is no user table, no key vault, no session store. The key
              sits in your browser&rsquo;s local storage. When a cue fires, it
              rides along on that one request, gets used, and is dropped when
              the request ends.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              That is a real constraint, not a slogan: it means we could not hand
              your key to anyone even if we were asked to, because we do not have
              it after the call returns.
            </p>
          </div>

          <div className="rounded-[14px] border border-line bg-panel p-7">
            <div className="space-y-4 font-mono text-sm">
              {[
                ["browser", "holds the key", true],
                ["/api/run", "borrows it for one call", true],
                ["anthropic", "answers", true],
                ["database", "does not exist", false],
              ].map(([where, what, live]) => (
                <div
                  key={where as string}
                  className="flex items-center justify-between border-b border-line pb-4 last:border-0 last:pb-0"
                >
                  <span className={live ? "text-fg" : "text-faint line-through"}>
                    {where}
                  </span>
                  <span className={live ? "text-muted" : "text-faint"}>
                    {what}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs leading-relaxed text-faint">
              Because storage is local, cues fire while the tab is open. That is
              the honest trade for not holding anyone&rsquo;s credentials.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Cost() {
  const rows = [
    ["One short cue", "~600 tokens", "$0.0004"],
    ["A three-cue morning brief", "~2,400 tokens", "$0.0016"],
    ["Every weekday for a month", "~52,000 tokens", "$0.035"],
  ];

  return (
    <section id="cost" className="mx-auto max-w-6xl px-6 py-24">
      <h2
        className="text-3xl font-semibold sm:text-4xl"
        style={{ letterSpacing: "-0.03em" }}
      >
        It costs about a nickel a month
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Haiku 4.5 is priced at $1 per million input tokens and $5 per million
        output. A daily brief does not move that needle. You pay Anthropic
        directly; Cueline takes nothing.
      </p>

      <div className="mt-12 overflow-x-auto rounded-[14px] border border-line">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="border-b border-line bg-panel text-xs tracking-wide text-faint uppercase">
              <th className="px-6 py-4 font-normal">Usage</th>
              <th className="px-6 py-4 font-normal">Roughly</th>
              <th className="px-6 py-4 text-right font-normal">Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([a, b, c]) => (
              <tr key={a} className="border-b border-line last:border-0">
                <td className="px-6 py-4">{a}</td>
                <td className="tnum px-6 py-4 font-mono text-sm text-muted">
                  {b}
                </td>
                <td className="tnum px-6 py-4 text-right font-mono text-accent">
                  {c}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Limits() {
  const items = [
    [
      "It does not log into anyone's Claude account",
      "Cueline talks to the Anthropic API with a key you own. It does not drive claude.ai, and it never asks for a Claude password.",
    ],
    [
      "It does not run with the tab closed",
      "The timer lives in your browser. Server-side firing needs somewhere to keep your key, and that is a trade we did not want to make in v1.",
    ],
    [
      "It does not keep your replies",
      "Answers live in the page until you clear them. Nothing is written anywhere we control.",
    ],
  ];

  return (
    <section className="border-t border-line bg-bg-raised/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <h2
          className="text-3xl font-semibold sm:text-4xl"
          style={{ letterSpacing: "-0.03em" }}
        >
          What it deliberately won&rsquo;t do
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Worth reading before you decide it fits.
        </p>

        <div className="mt-12 space-y-px overflow-hidden rounded-[14px] border border-line">
          {items.map(([t, d]) => (
            <div key={t} className="bg-panel p-7">
              <h3 className="font-medium">{t}</h3>
              <p className="mt-2.5 leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-4">
          <Link
            href="/console"
            className="rounded-[10px] bg-accent px-6 py-3 font-medium text-[#1a1206] transition-transform duration-150 hover:-translate-y-px"
          >
            Open the console
          </Link>
          <span className="text-sm text-faint">
            Takes a minute. Nothing to sign up for.
          </span>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Mark size={22} />
          <span className="text-sm text-muted">
            Cueline — scheduled prompts, no credentials held.
          </span>
        </div>
        <a
          href="https://github.com/bryankwandou/cueline"
          className="text-sm text-faint transition-colors duration-150 hover:text-fg"
        >
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
