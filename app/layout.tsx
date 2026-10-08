import type { Metadata } from "next";
import "./globals.css";
import { MotionPreference } from "@/components/motion-preference";
import localFont from "next/font/local";

const lato = localFont({ src: [{ path: "./fonts/Lato-Regular.ttf", weight: "400" }, { path: "./fonts/Lato-Bold.ttf", weight: "700" }], display: "swap", variable: "--font-lato" });

export const metadata: Metadata = {
  title: { default: "MIRA — Learning, noticed", template: "%s · MIRA" },
  description: "A calm, adaptive learning companion for families with young children.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={lato.variable}><body><MotionPreference />{children}</body></html>;
}
