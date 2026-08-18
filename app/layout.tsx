import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cueline — your prompts fire while you're still in traffic",
  description:
    "Queue the prompts you send every morning, set a timer, and let them run on schedule. Your Anthropic key stays in your browser.",
  icons: {
    icon: "/mark.svg",
  },
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
    <html lang="en">
      <body className="grain min-h-dvh antialiased">{children}</body>
    </html>
  );
}
