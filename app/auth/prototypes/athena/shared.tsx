"use client";

import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Compass, MapPin, Sparkles, X } from "lucide-react";
import { places, greeting, type ViewProps } from "./data";

export function Mascot({ small = false }: { small?: boolean }) {
  return <Image className={small ? "at-mascot small" : "at-mascot"} src="/athena-preview/mascot.png" alt="Athena, your golden starfish guide" width={160} height={160} />;
}

export function Shell({ children, label, onBoard }: { children: ReactNode; label: string; onBoard: () => void }) {
  return <div className="at-shell">
    <a className="at-skip" href="#at-main">Skip to your town</a>
    <header className="at-header"><a href="?v=1" className="at-brand"><span aria-hidden="true">✦</span> athena</a><span className="at-header-note">Little steps. A world of possibility.</span><button className="at-text-button" onClick={onBoard}><BookOpen size={18} /> Daily board</button></header>
    <main id="at-main" className={`at-main ${label}`}>{children}</main>
    <footer className="at-preview-note">Design preview · Sample family · Changes stay in this preview</footer>
  </div>;
}

export function Intro({ mode }: ViewProps) { return <div className="at-intro"><p className="at-kicker">YOUR LEARNING VILLAGE</p><h1>{greeting(mode)}</h1><p>Follow your child’s curiosity. We’ll help you find the resources.</p></div>; }

export function Town({ onPlace, compact = false }: { onPlace: (i: number) => void; compact?: boolean }) {
  return <div className={`at-town ${compact ? "compact" : ""}`}>
    <Image src="/athena-preview/village.png" width={1536} height={1024} alt="Five welcoming buildings connected by garden paths around Athena’s town square" priority sizes="(max-width: 760px) 100vw, 75vw" />
    {!compact && <div className="at-map-labels">{places.map((p, i) => <button key={p.name} className="at-map-pin" style={{ left: `${p.position[0]}%`, top: `${p.position[1]}%` }} onClick={() => onPlace(i)}><span className="at-pin-dot" style={{ background: p.color }} /><span>{p.name}</span><ArrowRight size={14} /></button>)}</div>}
  </div>;
}

export function PlaceList({ onPlace, mode }: ViewProps & { onPlace: (i: number) => void }) {
  const list = mode === "empty" ? [] : mode === "one" ? places.slice(0, 1) : places;
  return <div className="at-place-list" aria-label="Explore the buildings">{list.length ? list.map((p, i) => <button key={p.name} onClick={() => onPlace(i)}><span className="at-place-symbol" style={{ color: p.color }}><MapPin size={22} /></span><span>{mode === "worst" && i === 0 ? "Language House · 日本語 · العربية · Early conversations and multilingual storytelling" : p.name}<small>{p.short === "Language" ? "Stories, sounds & languages" : p.short === "Movement" ? "Movement & exploration" : p.short === "Discovery" ? "Curiosity & understanding" : p.short === "Connection" ? "Relationships & feelings" : "Music, making & imagination"}</small></span><ArrowRight size={17} /></button>) : <div className="at-empty"><Compass size={30} /><h3>Your town is taking shape.</h3><p>No focus is selected yet. Start with the daily board.</p></div>}</div>;
}

export function BoardCard({ onOpen, adapted }: { onOpen: () => void; adapted: boolean }) {
  return <section className="at-board-card"><div className="at-board-top"><span className="at-kicker">THE DAILY BOARD</span><span className="at-day">Day 1</span></div><span className="at-leaf" aria-hidden="true">✦</span><h2>{adapted ? "A gentler path, chosen by you." : "Let’s find your starting point."}</h2><p>{adapted ? "Shorter reading resources are first in your preview plan." : "Choose a focus. Discover a resource. Take it into your day."}</p><button className="at-primary" onClick={onOpen}>{adapted ? "See your updated path" : "Open today’s plan"}<ArrowRight size={18} /></button><span className="at-no-rush">At your pace. No catching up.</span></section>;
}

export function useTownFlow() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [screen, setScreen] = useState<"board" | "building" | "compare">("board");
  const [place, setPlace] = useState(0);
  const [adapted, setAdapted] = useState(false);
  const [selected, setSelected] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  function openBoard() { setScreen("board"); setNotice(""); dialog.current?.showModal(); }
  function openPlace(i: number) { setPlace(i); setScreen("building"); setNotice(""); dialog.current?.showModal(); }
  function close() { dialog.current?.close(); }
  const modal = <dialog ref={dialog} className="at-dialog" aria-labelledby="at-dialog-title" onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); } }}>
    <div className="at-dialog-top"><span className="at-kicker">{screen === "building" ? "EXPLORE YOUR TOWN" : "YOUR DAILY BOARD"}</span><button className="at-icon-button" aria-label="Close" onClick={close}><X size={21} /></button></div>
    {screen === "board" ? <><h2 id="at-dialog-title">A beginning that feels like you.</h2><p>Where would you like to begin today?</p><div className="at-focus-grid">{places.map((p, i) => <button aria-pressed={place === i} key={p.name} onClick={() => { setPlace(i); setSelected(true); }}><span style={{ background: p.color }} />{p.short}{place === i && <Check size={16} />}</button>)}</div><div className="at-plan-summary"><p className="at-kicker">{adapted ? "YOUR CHOSEN DIRECTION" : "YOUR CURRENT PATH"}</p><h3>{places[place].name}</h3><ol><li><strong>01</strong><span>{adapted ? "Find a short read" : "Explore a resource"}</span></li><li><strong>02</strong><span>Try it together, when you’re ready</span></li><li><strong>03</strong><span>Return and reflect</span></li></ol></div><button className="at-primary" onClick={() => { setScreen("building"); setSelected(true); }}>Visit {places[place].name}<ArrowRight size={18} /></button>{!adapted && <button className="at-text-button" onClick={() => setScreen("compare")}><Sparkles size={17} /> Preview a recommended change</button>}{saved && <p className="at-saved"><Check size={16} /> Saved: <a href="https://www.unicef.org/parenting/child-development" target="_blank" rel="noopener noreferrer">UNICEF child development collection ↗</a></p>}<p className="at-fine">{selected ? "Your focus is selected for this preview." : "Choose any focus. Other buildings stay open."}</p></> : screen === "building" ? <><button className="at-text-button" onClick={() => setScreen("board")}><ArrowLeft size={16} /> Daily board</button><h2 id="at-dialog-title">{places[place].name}</h2><div className="at-dialog-guide"><Mascot small /><div><h3>{places[place].topic}</h3><p>{places[place].detail}</p></div></div><div className="at-resource-example"><BookOpen size={30} /><div><span className="at-kicker">UNICEF · PARENT RESOURCE COLLECTION</span><h3>Child development</h3><p>Explore UNICEF’s published guidance. This is a source collection, not a personalized or age-checked recommendation.</p></div><a className="at-primary" href="https://www.unicef.org/parenting/child-development" target="_blank" rel="noopener noreferrer">Open UNICEF <ArrowRight size={16} /><span className="at-sr-only"> in a new tab</span></a></div><button className="at-text-button" onClick={() => { setSaved(true); setNotice("Saved to your preview board. Refreshing or switching designs resets this sample."); }}>{saved ? "Saved to your preview board" : "Save this collection for later"}</button><p className="at-fine">This preview explores the town and planner. Voice conversations and personalized resource results are not connected here.</p></> : <><h2 id="at-dialog-title">You choose the way forward.</h2><p>Example: you confirmed that you generally prefer shorter reading resources.</p><div className="at-path-options"><section><p className="at-kicker">KEEP YOUR PATH</p><h3>A mix of formats</h3><p>Video → reading → reflection</p><button className="at-secondary" onClick={() => { setScreen("board"); setNotice("Your current path is unchanged."); }}>Keep current path</button></section><section className="recommended"><p className="at-kicker">ATHENA SUGGESTS</p><h3>Short reads first</h3><p>Short reading → try together → reflection</p><button className="at-primary" onClick={() => { setAdapted(true); setScreen("board"); setNotice("Preview updated: future suggestions now prioritize short reads. You can undo this."); }}>Choose this direction<ArrowRight size={16} /></button></section></div><p className="at-fine">This changes the upcoming resource format in the preview. It does not rate your child or change what you’ve already done.</p></>}
    <p className="at-notice" role="status">{notice}</p>{adapted && <button className="at-text-button" onClick={() => { setAdapted(false); setNotice("Original direction restored in this preview."); }}>Undo direction change</button>}
  </dialog>;
  return { openBoard, openPlace, adapted, modal };
}

