"use client";

import { createClient } from "@/lib/supabase/client";
import { BookHeart, CalendarDays, House, LogOut, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navigation = [
  { href: "/today", label: "Today", icon: House },
  { href: "/week", label: "Week", icon: CalendarDays },
  { href: "/ask", label: "Ask", icon: MessageCircle },
  { href: "/insights", label: "Journey", icon: BookHeart },
  { href: "/family", label: "Family", icon: Users },
];

export function AppHeader({ familyName }: { familyName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logOut() {
    setBusy(true);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="border-b border-[#91aaa2]/45 bg-[#f4f1ea]/92 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-10">
          <div className="flex items-center gap-9">
            <Link href="/today" className="font-serif text-2xl tracking-tight text-ink" aria-label="MIRA home">MIRA</Link>
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Main navigation">
              {navigation.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={active
                      ? "rounded-full bg-[#f6e7be] px-4 py-2 text-sm font-semibold text-[#386357]"
                      : "rounded-full px-4 py-2 text-sm font-semibold text-ink/60 transition hover:bg-[#fffdf6] hover:text-ink"}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden max-w-44 truncate text-sm text-ink/50 lg:block">{familyName}</span>
            <button onClick={logOut} disabled={busy} className="button-ghost gap-2" aria-label="Log out">
              <LogOut size={16} /><span className="hidden lg:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-[1.25rem] border border-[#bfd9d8] bg-[#fffdf6]/95 p-1.5 shadow-[0_18px_50px_rgba(41,50,47,.18)] backdrop-blur sm:hidden" aria-label="Mobile navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={active
                ? "flex flex-col items-center gap-1 rounded-xl bg-[#f6e7be] px-1 py-2 text-[10px] font-semibold text-[#386357]"
                : "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold text-ink/55"}
            >
              <Icon size={18} />{item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
