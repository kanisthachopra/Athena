"use client";

import { useSyncExternalStore } from "react";

const key = "mira-motion";
function snapshot() { try { return localStorage.getItem(key) !== "off"; } catch { return true; } }
function subscribe(notify: () => void) {
  const sync = () => { document.documentElement.dataset.motion = snapshot() ? "on" : "off"; notify(); };
  sync(); window.addEventListener("storage", sync); window.addEventListener("mira-motion", sync);
  return () => { window.removeEventListener("storage", sync); window.removeEventListener("mira-motion", sync); };
}
export function MotionPreference({ control = false }: { control?: boolean }) {
  const enabled = useSyncExternalStore(subscribe, snapshot, () => true);
  if (!control) return null;
  return <label className="flex items-start gap-3"><input className="mt-1 size-5 accent-primary" type="checkbox" checked={enabled} onChange={event => { try { localStorage.setItem(key, event.target.checked ? "on" : "off"); } catch { /* Preference still applies to this page when storage is unavailable. */ } document.documentElement.dataset.motion = event.target.checked ? "on" : "off"; window.dispatchEvent(new Event("mira-motion")); }} /><span>Animate changes<p className="mt-1 text-sm text-muted-foreground">This device only. Your system’s reduced-motion setting always takes priority.</p></span></label>;
}
