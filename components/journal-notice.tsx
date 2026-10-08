"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const JournalNoticeContext = createContext<(text: string, focus?: boolean) => void>(() => {});
export const useJournalNotice = () => useContext(JournalNoticeContext);

// This boundary survives removal of a note row during server revalidation.
export function JournalNoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState({ text: "", serial: 0, focus: false });
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => { if (notice.focus) status.current?.focus(); }, [notice]);
  return <JournalNoticeContext.Provider value={(text, focus = false) => setNotice(previous => ({ text, focus, serial: previous.serial + 1 }))}>
    <div ref={status} role="status" tabIndex={-1} className={notice.text ? "my-5 text-sm font-semibold text-primary" : ""}>
      <span key={notice.serial}>{notice.text}</span>
    </div>
    {children}
  </JournalNoticeContext.Provider>;
}
