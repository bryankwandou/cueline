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

Next.js 15 (App Router), React 19, Tailwind CSS v4, `@anthropic-ai/sdk`.
No database, no auth provider, no analytics.

## Design

Tokens, palette, motion rules and voice live in [`brand.md`](./brand.md).

## Licence

MIT.
