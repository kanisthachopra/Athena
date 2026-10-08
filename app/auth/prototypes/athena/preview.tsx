"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Village from "./village";
import Trail from "./trail";
import Fieldnotes from "./fieldnotes";
import { modes, modeNames, type DataMode } from "./data";
import "./preview.css";

const variants = [Village, Trail, Fieldnotes];
const names = ["Village", "Trail", "Fieldnotes"];
export default function Preview({ initialVariant, initialMode }: { initialVariant: number; initialMode: DataMode }) {
  const [current, setCurrent] = useState(initialVariant);
  const [replay, setReplay] = useState(0);
  const [mode, setMode] = useState<DataMode>(initialMode);
  const picker = useRef<HTMLElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let secondFrame = 0;
    const frame = requestAnimationFrame(() => { secondFrame = requestAnimationFrame(() => picker.current?.setAttribute("data-ready", "")); });
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(secondFrame); };
  }, []);
  useLayoutEffect(() => {
    function measure() {
      const item = picker.current?.querySelectorAll<HTMLButtonElement>(".proto-picker-item")[current];
      if (item && highlight.current) { highlight.current.style.width = `${item.offsetWidth}px`; highlight.current.style.transform = `translateX(${item.offsetLeft}px)`; }
    }
    measure(); window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure);
  }, [current]);
  function choose(index: number) {
    setCurrent(index); setReplay(n => n + 1); window.scrollTo({ top: 0, behavior: "instant" });
    const url = new URL(window.location.href); url.searchParams.set("v", String(index + 1)); history.replaceState(null, "", url);
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || document.querySelector("dialog[open]")) return;
      const num = Number(e.key);
      if (num >= 1 && num <= names.length) choose(num - 1);
      else if (e.key === "ArrowRight") { e.preventDefault(); choose((current + 1) % names.length); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); choose((current - 1 + names.length) % names.length); }
      else if (e.key.toLowerCase() === "r") setReplay(n => n + 1);
    }
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [current]);
  const Variant = variants[current];
  return <div className="athena-preview" data-input="pointer" onPointerDownCapture={e => { e.currentTarget.dataset.input = "pointer"; }} onKeyDownCapture={e => { e.currentTarget.dataset.input = "keyboard"; }}><Variant key={`${current}-${replay}-${mode}`} mode={mode} /><div className="at-test-controls"><label htmlFor="at-fixture">Preview data</label><select id="at-fixture" value={mode} onChange={e => { const value = e.target.value as DataMode; setMode(value); const url = new URL(location.href); url.searchParams.set("data", value); history.replaceState(null, "", url); }}>{modes.map((m, i) => <option key={m} value={m}>{modeNames[i]}</option>)}</select></div><nav ref={picker} className="proto-picker" aria-label="Prototype variants"><span ref={highlight} className="proto-picker-highlight" aria-hidden="true" />{names.map((name, i) => <button key={name} className="proto-picker-item" data-active={i === current ? "" : undefined} aria-current={i === current ? "true" : undefined} onClick={() => choose(i)}>{name}</button>)}<span className="proto-picker-divider" aria-hidden="true" /><button className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={() => setReplay(n => n + 1)}>↻</button></nav></div>;
}


