import type { Metadata, Viewport } from "next";
import WorldPreview from "./preview";

export const metadata: Metadata = { title: "Athena · A place to grow", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#173e37" };

export default function Page() { return <WorldPreview />; }
