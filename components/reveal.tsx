"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Milliseconds to hold before this element settles. Used to stagger siblings. */
  delay?: number;
  /** Tag to render. Sections should stay sections for the outline to survive. */
  as?: "div" | "section" | "li" | "tr";
  className?: string;
  id?: string;
}

/**
 * Reveals its children once, when they first cross into view.
 *
 * Once — not on every pass. Content that re-animates each time you scroll
 * back up turns a page into a slideshow and makes re-reading a paragraph
 * annoying, so the observer disconnects after the first trigger.
 *
 * The element starts hidden in CSS, not here, so nothing flashes at full
 * opacity before hydration.
 */
export function Reveal({
  children,
  delay = 0,
  as = "div",
  className = "",
  id,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Anything already on screen at load shows immediately — waiting for a
    // scroll that may never come would leave the first paint half-empty.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      // Fires slightly before the edge, so the settle finishes about when
      // the section reaches comfortable reading position.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as "div";

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      id={id}
      data-shown={shown}
      className={`reveal ${className}`}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
