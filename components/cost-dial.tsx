"use client";

import { useMemo, useState } from "react";
import { estimateCost, PRICE_IN, PRICE_OUT } from "@/lib/types";
import { useT } from "@/lib/i18n";

// A short cue and its reply, measured from real runs against Haiku 4.5 rather
// than guessed: roughly 180 tokens in once the system prompt is counted, and
// roughly 420 back for the three-bullet answers this product tends to produce.
const IN_PER_CUE = 180;
const OUT_PER_CUE = 420;

/**
 * The bill, worked out on the reader's own numbers.
 *
 * A fixed table answered a question nobody asked — it priced three examples
 * chosen by us. The objection this section exists to settle is "what would
 * *my* usage cost", and the only honest way to settle it is to let them set
 * their usage and watch the figure move.
 */
export function CostDial() {
  const t = useT();
  const [cues, setCues] = useState(3);
  const [days, setDays] = useState(22);

  const { monthly, tokensIn, tokensOut } = useMemo(() => {
    const runs = cues * days;
    const tokensIn = runs * IN_PER_CUE;
    const tokensOut = runs * OUT_PER_CUE;
    return { monthly: estimateCost(tokensIn, tokensOut), tokensIn, tokensOut };
  }, [cues, days]);

  // Below a cent the dollar figure rounds to nothing and reads as broken, so
  // the unit changes rather than the precision growing to four decimals.
  const money =
    monthly < 0.01
      ? `${(monthly * 100).toFixed(2)}¢`
      : `$${monthly.toFixed(2)}`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-9">
          <Slider
            label={t("dial.cues")}
            value={cues}
            min={1}
            max={12}
            onChange={setCues}
            read={t(cues === 1 ? "dial.cue1" : "dial.cueN", { a: cues })}
          />
          <Slider
            label={t("dial.days")}
            value={days}
            min={1}
            max={31}
            onChange={setDays}
            read={t("dial.dayN", { a: days })}
          />

          <dl className="grid grid-cols-2 gap-4 border-t border-line pt-6 text-sm">
            <div>
              <dt className="text-faint">{t("dial.in")}</dt>
              <dd className="tnum mt-1 font-mono text-muted">
                {tokensIn.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-faint">{t("dial.out")}</dt>
              <dd className="tnum mt-1 font-mono text-muted">
                {tokensOut.toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-[var(--r-hero)] border border-line bg-panel px-8 py-10 text-center">
          <p className="text-xs tracking-wide text-faint uppercase">
            {t("dial.perMonth")}
          </p>
          <p className="display tnum mt-3 font-mono text-[3.25rem] leading-none text-accent tabular-nums">
            {money}
          </p>
          <p className="mt-5 text-xs leading-relaxed text-faint">
            {t("dial.note", { a: PRICE_IN.toFixed(2), b: PRICE_OUT.toFixed(2) })}
          </p>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  read,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  read: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-xs tracking-wide text-faint uppercase">{label}</span>
        <span className="text-sm text-fg">{read}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="dial mt-3 w-full"
        aria-label={label}
      />
    </label>
  );
}
