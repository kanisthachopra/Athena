import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MIRA — Learning, noticed", template: "%s · MIRA" },
  description: "A calm, adaptive learning companion for families with young children.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
