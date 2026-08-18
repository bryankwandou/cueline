import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * Two deliberate choices, not defaults.
 *
 * Bricolage has slightly odd, tightly-drawn counters that give headings a
 * voice at display sizes without becoming a novelty face at body sizes.
 * JetBrains Mono carries every number in the product — the countdown is the
 * hero object, so the numerals had to be chosen rather than inherited.
 */
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cueline — your prompts fire while you're still in traffic",
  description:
    "Queue the prompts you send every morning, set a timer, and let them run on schedule. Your Anthropic key stays in your browser.",
  icons: { icon: "/mark.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body className="grain min-h-dvh antialiased">{children}</body>
    </html>
  );
}
