# Cueline

Queue the prompts you send every morning, put a clock on them, and read the
answers when you sit down. Nobody has to type at a red light.

Live: <https://cueline-delta.vercel.app>

Built on the Anthropic API with **Claude Haiku 4.5**, no thinking — the point is a
cheap, predictable daily brief, not deep reasoning. A three-cue morning run costs
roughly a sixth of a cent.

## What it is

- A countdown timer in hours, minutes and seconds
- An ordered queue of prompts ("cues") that run top to bottom when it hits zero
- Two modes — **Run them** (sends to the API with your key) and **Just remind me**
  (sends nothing anywhere, only nudges you)
- Two places to run — **in this tab**, or **handed to the server** so it fires
  with the laptop shut
- Once, every day, or weekdays only
- Token counts and running cost per cue

## Where your key lives

It depends on which of the two runs you ask for, and the difference is the whole
honest part of this README.

**In-tab runs and reminder mode.** The key stays in your browser's
`localStorage` and goes nowhere else. `app/api/run/route.ts` is about eighty
lines and writes nothing; the key rides one request, gets used, and is gone when
the response returns.

**Handed-over runs.** There is no arrangement where the key stays only in the
browser and the queue still fires at seven in the morning with the lid down.
So in this mode the key does leave your browser: it is sealed with AES-256-GCM
under `VAULT_SECRET`, sits as ciphertext in one Postgres row, and is blanked in
the same statement that writes the replies. A repeating run keeps its key
between firings — that is a real cost, so it is opt-in and the console says so
beside the control.

You can watch the wipe happen without any credentials: `GET
/api/schedule/<handle>` returns `key_held`, which flips from `true` to `false`
when the run settles.

## What it deliberately doesn't do

- **It does not log into anyone's Claude account.** It talks to the Anthropic API
  with a key you own, billed to you. It is not a way to use a Claude
  subscription; it never asks for a Claude password and does not drive claude.ai.
- **It does not keep your replies longer than a week.** Settled rows delete
  themselves after seven days.
- **It does not accept unlimited scheduling.** Ten runs an hour and forty a day
  per caller, counted against a salted digest of the address, never the address.

## How the clock gets knocked on

The console's own timer needs the tab open, which is no use for a brief. Handing
a run over posts the queue and the sealed key to `/api/schedule`, and the row
waits.

A GitHub Actions workflow then starts a **shift**: one run that stays alive 55
minutes and calls `/api/tick` every 30 seconds. Free scheduled actions are
deprioritised — asking for `*/5` was measured arriving 19 to 53 minutes late —
so the design stopped needing GitHub to hit a minute and only needs it to start
*a* run inside the window. Overlapping shifts are harmless: rows are claimed
with a conditional `UPDATE`, so exactly one shift can win a row. Vercel's own
cron runs once a day underneath as a floor, which is the most the free tier
will do.

Measured, not asserted. Nine runs booked twenty minutes apart across three
hours, each one timed against its own due moment:

```
best +2s   median +5s   worst +17s   9/9 fired
```

The raw log is [`test/lateness.log`](./test/lateness.log) and the probe that
produced it is [`test/lateness.mjs`](./test/lateness.mjs) — three hours to
reproduce, no key spent, because the probe's key is deliberately invalid.

## Proofs

All three are runnable by a stranger. The first needs nothing but Node.

```bash
node --experimental-strip-types test/repeat.mjs   # the recurrence arithmetic, incl. the weekend in your zone
node test/contract.mjs   # public API: validation, key hiding, key wipe, real Anthropic contact
node test/interact.mjs   # the pages, in a real browser (needs puppeteer-core + Chrome)
node test/limit.mjs      # the ceiling on /api/schedule — run this LAST, it spends the hour
node test/lateness.mjs   # how late runs actually land (three hours to complete)
node test/chain.mjs      # a daily run really does leave a successor behind (~3 minutes)
```

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000, then get an API key from the
[Anthropic Console](https://console.anthropic.com/settings/keys).

In-tab and reminder mode need no environment at all. Handed-over runs need
`DATABASE_URL`, `VAULT_SECRET`, and `CRON_SECRET` set in the project, with
`CRON_SECRET` mirrored as a repository secret so the workflow can authenticate.

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS v4, `@anthropic-ai/sdk`,
Neon Postgres. No auth provider, no analytics.

## Design

Tokens, palette, motion rules and voice live in [`brand.md`](./brand.md).

## Licence

MIT.
