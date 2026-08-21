# Cueline

Queue the prompts you send every morning, put a clock on them, and read the
answers when you sit down. Nobody has to type at a red light.

Built on the Anthropic API with **Claude Haiku 4.5**, no thinking — the point is a
cheap, predictable daily brief, not deep reasoning. A three-cue morning run costs
roughly a sixth of a cent.

## What it is

- A countdown timer in hours, minutes and seconds
- An ordered queue of prompts ("cues") that run top to bottom when it hits zero
- Two modes — **Run them** (sends to the API with your key) and **Just remind me**
  (sends nothing anywhere, only nudges you)
- Token counts and running cost per cue

## Where your key lives

In your browser's `localStorage`, and nowhere else. There is no user table, no key
vault, and no session store in this repo — check `app/api/run/route.ts`, it is
about eighty lines and it writes nothing. The key rides along on a single request,
gets used, and is gone when the response returns.

The honest trade: because the key is local, cues fire while the tab is open.
Server-side scheduling would require holding credentials, and that is not a
trade this version makes.

## What it deliberately doesn't do

- **It does not log into anyone's Claude account.** It talks to the Anthropic API
  with a key you own. It never asks for a Claude password and does not drive
  claude.ai.
- **It does not run with the tab closed.** See above.
- **It does not keep your replies.** They live in the page until you clear them.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000, then get an API key from the
[Anthropic Console](https://console.anthropic.com/settings/keys).

No environment variables are needed. The app never reads a key from the server
environment — it only ever uses the one you paste in the browser.

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS v4, `@anthropic-ai/sdk`.
No database, no auth provider, no analytics.

## Design

Tokens, palette, motion rules and voice live in [`brand.md`](./brand.md).

## Licence

MIT.

## Running with the tab closed

The console's own timer needs this tab open, which is no use for a cue set
for seven in the morning. "Hand this run to the server" posts the queue and
your key to `/api/schedule`; the key is sealed with AES-256-GCM under
`VAULT_SECRET` and the row waits in Postgres.

A GitHub Actions schedule calls `/api/tick` every five minutes, which claims
any due row, sends its cues to Haiku 4.5, writes the replies back, and blanks
the stored key in the same statement. Finished rows are deleted after a week.
Vercel's own cron runs once a day underneath as a floor — the free tier there
will not do better than daily.

Two things follow from this that are worth saying plainly. A cue can land up
to five minutes late, because that is how often the door gets knocked on. And
in this mode the key does leave your browser: it sits encrypted on our side
until the run finishes. Reminder mode and the in-tab timer still send nothing
anywhere.

Set `DATABASE_URL`, `VAULT_SECRET`, and `CRON_SECRET` in the project, and
mirror `CRON_SECRET` as a repository secret so the workflow can authenticate.
