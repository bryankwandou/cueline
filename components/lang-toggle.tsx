"use client";

import { useLang, type Lang } from "@/lib/i18n";

/**
 * Two labels sharing a border, with the active one filled. A dropdown for a
 * binary choice hides half the options behind a click for no reason.
 */
export function LangToggle() {
  const { lang, setLang } = useLang();

  return (
    <div
      className="flex items-center rounded-[var(--r-pill)] border border-line p-0.5 text-xs"
      role="group"
      aria-label="Language"
    >
      {(
        [
          ["en", "EN"],
          ["id", "ID"],
        ] as [Lang, string][]
      ).map(([code, label]) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`rounded-[var(--r-pill)] px-2.5 py-1 transition-colors duration-150 ${
            lang === code
              ? "bg-fg font-medium text-bg"
              : "text-muted hover:text-fg"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
