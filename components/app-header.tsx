"use client";

import { createClient } from "@/lib/supabase/client";
import { BookOpen, CalendarDays, House, LogOut, MessageCircle, Users, Settings, CircleHelp, NotebookPen, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";

const navigation = [
  { href: "/today", label: "Today", icon: House },
  { href: "/week", label: "Week", icon: CalendarDays },
  { href: "/guide", label: "Guide", icon: MessageCircle },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/insights", label: "Insights", icon: NotebookPen },
  { href: "/family", label: "Family", icon: Users },
];
export function AppHeader({ familyName }: { familyName: string }) {
  const pathname = usePathname(), router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const title = [...navigation, { href: "/setup", label: "Learning preferences" }, { href: "/settings", label: "Settings" }, { href: "/help", label: "Help" }, { href: "/memory", label: "What MIRA understands" }].find(item => pathname === item.href || pathname.startsWith(item.href + "/"))?.label ?? "Experience";
  async function logOut() {
    setBusy(true); setError("");
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      router.push("/"); router.refresh();
    } catch { setError("Could not log out. Please try again."); }
    finally { setBusy(false); }
  }
  return <>
    <a href="#mira-content" className="mira-skip">Skip to content</a>
    <header className="mira-workspace-header"><button ref={menuButton} className="mira-menu-toggle" aria-controls="mira-navigation" aria-expanded={expanded} aria-label={expanded ? "Close navigation" : "Open navigation"} onClick={() => setExpanded(!expanded)}>{expanded ? <X size={21} /> : <Menu size={21} />}</button><span>{familyName}</span><span aria-hidden="true">/</span><span className="text-foreground">{title}</span></header>
    <aside className={"mira-sidebar " + (expanded ? "is-open" : "")} id="mira-navigation" onKeyDown={event => { if (event.key === "Escape" && expanded) { setExpanded(false); menuButton.current?.focus(); } }}>
      <Link href="/today" className="mira-wordmark" aria-label="MIRA home">MIRA</Link>
      <p className="mira-family-name">{familyName}</p>
      <nav aria-label="Main navigation">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setExpanded(false)} aria-current={pathname === href || pathname.startsWith(href + "/") ? "page" : undefined}><Icon size={18} aria-hidden="true" />{label}</Link>)}</nav>
      <nav className="mira-sidebar-secondary" aria-label="Account and support">
        <Link href="/settings" aria-current={pathname === "/settings" ? "page" : undefined} onClick={() => setExpanded(false)}><Settings size={18} aria-hidden="true" />Settings</Link>
        <Link href="/help" aria-current={pathname === "/help" ? "page" : undefined} onClick={() => setExpanded(false)}><CircleHelp size={18} aria-hidden="true" />Help</Link>
        <button onClick={logOut} disabled={busy}><LogOut size={18} aria-hidden="true" />{busy ? "Logging out…" : "Log out"}</button>
      </nav>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </aside>
    <div id="mira-content" tabIndex={-1} />
  </>;
}
