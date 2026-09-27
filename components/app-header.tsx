"use client";

import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AppHeader({ familyName }: { familyName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logOut() {
    setBusy(true);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-black/5 bg-[#fffdf8]/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-10">
        <div className="flex items-center gap-8">
          <Link href="/today" className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-ink text-xs font-bold text-[#f7f3e9]">M</span><span className="font-serif text-xl font-semibold">MIRA</span></Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main navigation">
            <Link href="/today" className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-[#ece6d8]">Today</Link>
            <Link href="/week" className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-[#ece6d8]">Week</Link>
            <Link href="/insights" className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-[#ece6d8]">Insights</Link>
            <Link href="/setup" className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-[#ece6d8]">Profile</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden max-w-44 truncate text-sm text-ink/55 sm:block">{familyName}</span>
          <button onClick={logOut} disabled={busy} className="button-ghost gap-2" aria-label="Log out"><LogOut size={16} /><span className="hidden sm:inline">Log out</span></button>
        </div>
      </div>
    </header>
  );
}
