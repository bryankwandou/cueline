# Cueline — brand

## The name

**Cue** is the signal that starts something — a stage cue, a camera tally light, a
cue sheet. **Line** is both the queue the cues sit in and the timeline they sit on.
Two short, common English words, no invented spelling, no dropped vowel. It reads
correctly on first sight in Indonesian and English alike.

## The mark

A countdown sweep that ends in a solid dot. The arc is time passing; the dot is the
moment the cue fires. It reads as a clock, a record indicator, and a progress ring
at once, and it survives being shrunk to a 16px favicon because there is only one
shape and one filled accent.

Never rotate it, never fill the ring, never place the dot anywhere but the arc's
terminal.

## Palette — Warm Monochrome × Stark Minimal

A single accent. Everything else is a warm gray ramp. Color carries meaning here;
it is not decoration.

| Token | Dark (canonical) | Role |
|---|---|---|
| `--bg` | `#0b0b0c` | page ground, warm near-black — never `#000` |
| `--bg-raised` | `#131314` | inset fields, table stripes |
| `--panel` | `#171718` | cards and panels |
| `--border` | `rgba(255,255,255,0.08)` | hairline, barely visible |
| `--fg` | `#ededec` | body text |
| `--fg-muted` | `#8d8d87` | secondary copy |
| `--fg-faint` | `#5e5e5a` | labels, metadata |
| `--accent` | `#f0a53c` | signal amber — armed states, live numerals, primary action |
| `--ok` / `--bad` | `#5bd08a` / `#f2726b` | run status only |

Amber appears in roughly one place per screen. If a mock has three amber elements
competing, two of them are wrong.

## Type

System sans for everything, monospace for anything numeric or machine-authored —
timers, token counts, costs, API keys, endpoint names. All numerals that stack
vertically use `tabular-nums` so digits do not jitter as they count down.

Display headings run tight (`-0.03em` to `-0.04em`). Three weights maximum:
regular, medium, semibold.

## Motion

Crisp, under 200ms for state changes, 480ms for entrances. Custom easing
(`cubic-bezier(0.32, 0.72, 0, 1)`), never a CSS default, never a bounce. Entry
takes longer than exit. The armed timer pulses once every 2.4s — the only looping
animation in the product, and it earns its place because it signals live state.

## Voice

Plain, specific, slightly dry. Short sentences. Concrete nouns.

Say what the product does and what it refuses to do, in the same tone. The
landing page has a section listing three things Cueline will not do — that section
is not an apology, it is the strongest trust signal on the page and it stays.

Never: exclamation marks, emoji, "seamlessly", "effortlessly", "revolutionise",
"unlock", "supercharge", "game-changing", or a headline that is a question.
