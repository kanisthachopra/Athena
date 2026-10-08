import type { Metadata, Viewport } from "next";
import Preview from "./preview";
import { modes, type DataMode } from "./data";

export const metadata: Metadata = { title: "Athena · Town design preview", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f6f3e8" };

export default async function Page({ searchParams }: { searchParams: Promise<{ v?: string; data?: string }> }) {
  const params = await searchParams;
  const parsed = Number(params.v) - 1;
  const initialVariant = Number.isInteger(parsed) && parsed >= 0 && parsed < 3 ? parsed : 0;
  const initialMode = modes.includes(params.data as DataMode) ? params.data as DataMode : "demo";
  return <Preview initialVariant={initialVariant} initialMode={initialMode} />;
}
