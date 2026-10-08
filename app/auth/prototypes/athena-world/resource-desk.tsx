"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Check, LoaderCircle, Mic, Search, Square, X } from "lucide-react";
import { resources, languageOptions } from "@/lib/athena/resource-catalog";
import { ageBands } from "@/lib/athena/resource-context";
import type { Place } from "./world-data";
import "./resource-desk.css";

type Card = { id: string; title: string; url: string; publisher: string; description: string; ageNote: string; format: string; access: string; thumbnail?: string; thumbnailCredit?: string; thumbnailLicenseUrl?: string };
type Explanation = { overview: string; points: { text: string; evidence: string }[]; limitation: string; partial: boolean };

async function post(path: string, body: BodyInit, signal: AbortSignal, headers: Record<string, string>) {
  const response = await fetch(path, { method: "POST", body, signal: AbortSignal.any([signal, AbortSignal.timeout(75_000)]), headers });
  const value = await response.json().catch(() => ({ error: "The service could not respond. Please try again." }));
  if (!response.ok) throw Object.assign(new Error(value.error || "Please try again."), { status: response.status });
  return value;
}

export function ResourceDesk({ place, age, setAge, language, setLanguage }: { place: Place; age: string; setAge: (value: string) => void; language: string; setLanguage: (value: string) => void }) {
  const [query, setQuery] = useState("");
  const [deskView, setDeskView] = useState<"browse" | "ask">("browse");
  const [searchConsent, setSearchConsent] = useState(false), [voiceConsent, setVoiceConsent] = useState(false), [explainConsent, setExplainConsent] = useState(false);
  const [busy, setBusy] = useState<"search" | "explain" | "voice" | null>(null);
  const [recording, setRecording] = useState(false), [starting, setStarting] = useState(false), [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(""), [signIn, setSignIn] = useState(false), [failures, setFailures] = useState(0);
  const [results, setResults] = useState<Card[] | null>(null), [selected, setSelected] = useState<Card | null>(null), [explanation, setExplanation] = useState<Explanation | null>(null);
  const [followup, setFollowup] = useState("");
  const [notice, setNotice] = useState("");
  const recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), timeout = useRef<ReturnType<typeof setTimeout> | null>(null), ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const request = useRef<AbortController | null>(null), generation = useRef(0), cancelled = useRef(false), message = useRef<HTMLTextAreaElement>(null);
  const focusTranscript = useRef(false);
  useEffect(() => { if (focusTranscript.current && !busy && !recording && !starting) { focusTranscript.current = false; message.current?.focus(); } }, [busy, recording, starting]);

  function stopTracks() { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; if (timeout.current) clearTimeout(timeout.current); if (ticker.current) clearInterval(ticker.current); }
  useEffect(() => () => { generation.current++; cancelled.current = true; request.current?.abort(); if (recorder.current?.state === "recording") recorder.current.stop(); stopTracks(); }, []);
  function fail(value: unknown) {
    if (value instanceof Error && value.name === "AbortError") return;
    setError(value instanceof Error ? value.message : "Please try again.");
    setSignIn(!!value && typeof value === "object" && "status" in value && value.status === 401);
  }
  function cancel() { generation.current++; cancelled.current = true; request.current?.abort(); if (recorder.current?.state === "recording") recorder.current.stop(); stopTracks(); setRecording(false); setStarting(false); setBusy(null); setNotice("Cancelled. Nothing has been added to your plan."); }

  async function startVoice() {
    setError(""); setNotice(""); setStarting(true); cancelled.current = false;
    const token = ++generation.current;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setStarting(false); setError("This browser can’t record here. Please type your message below."); message.current?.focus(); return; }
    try {
      const preflight = new AbortController(); request.current = preflight;
      await post("/api/athena/status", "{}", preflight.signal, { "Content-Type": "application/json" });
      if (cancelled.current || token !== generation.current) return;
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelled.current || token !== generation.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(t => MediaRecorder.isTypeSupported(t));
      if (!mimeType) throw Error("This browser’s recording format isn’t supported. Please type below.");
      const active = new MediaRecorder(media, { mimeType, audioBitsPerSecond: 64000 });
      recorder.current = active;
      const chunks: Blob[] = [];
      let bytes = 0;
      active.ondataavailable = event => { bytes += event.data.size; chunks.push(event.data); if (bytes > 2_900_000 && active.state === "recording") active.stop(); };
      active.onerror = () => { if (token !== generation.current) return; cancelled.current = true; stopTracks(); setRecording(false); setError("The microphone stopped working. Please type below."); };
      active.onstop = async () => {
        if (cancelled.current || token !== generation.current) return; stopTracks();
        setRecording(false); setBusy("voice");
        const controller = new AbortController(); request.current = controller;
        try {
          const result = await post("/api/athena/voice", new Blob(chunks, { type: mimeType }), controller.signal, { "Content-Type": mimeType, "X-Athena-Voice-Consent": "deepgram-v1" });
          if (token !== generation.current) return;
          if (selected) setFollowup(result.transcript); else setQuery(result.transcript);
          setFailures(0); setNotice("Here’s what I heard. Check or edit it, then send when you’re ready."); focusTranscript.current = true;
        } catch (e) { if (token === generation.current) { fail(e); setFailures(n => n + 1); } }
        finally { if (token === generation.current) setBusy(null); }
      };
      active.start(250); setRecording(true); setStarting(false); setSeconds(0);
      ticker.current = setInterval(() => setSeconds(n => n + 1), 1000);
      timeout.current = setTimeout(() => { if (active.state === "recording") active.stop(); }, 60_000);
    } catch (e) {
      if (token !== generation.current) return; stopTracks();
      setStarting(false); setFailures(n => n + 1); fail(e); if (e instanceof DOMException && e.name === "NotAllowedError") setError("Microphone access is off. You can type below, or allow it in your browser and try again."); focusTranscript.current = true;
    }
  }

  async function search() {
    setBusy("search"); setError(""); setNotice(""); setSignIn(false);
    const controller = new AbortController(); request.current = controller; const token = ++generation.current;
    try {
      const data = await post("/api/athena/resources", JSON.stringify({ action: "search", query, domain: place.id, ageMonths: Number(age), language: place.id === "language" ? language : "English", shareWithTavily: searchConsent }), controller.signal, { "Content-Type": "application/json" });
      if (token !== generation.current) return;
      setResults(data.results.map((r: { url: string; title: string; snippet: string }) => ({ id: r.url, title: r.title, url: r.url, publisher: new URL(r.url).hostname.replace(/^www\./, ""), description: r.snippet.slice(0, 240), ageNote: "New search result · age fit and free access still need checking", format: "web resource", access: "Check access" })));
      setDeskView("browse");
      setNotice(data.results.length ? "Here are some leads. Open a source or ask me to explain what it actually says." : "I didn’t find a good match. Try a simpler request, or browse the starting shelf.");
    } catch (e) { if (token === generation.current) fail(e); }
    finally { if (token === generation.current) setBusy(null); }
  }
  async function explain() {
    if (!selected) return;
    setBusy("explain"); setError(""); setNotice(""); setSignIn(false);
    const controller = new AbortController(); request.current = controller; const token = ++generation.current;
    try {
      const data = await post("/api/athena/resources", JSON.stringify({ action: "explain", url: selected.url, ageMonths: age === "" ? null : Number(age), question: followup || "Summarize this for a parent. What does the source suggest?", shareWithTavily: true, shareWithNebius: explainConsent }), controller.signal, { "Content-Type": "application/json" });
      if (token === generation.current) setExplanation(data);
    } catch (e) { if (token === generation.current) fail(e); }
    finally { if (token === generation.current) setBusy(null); }
  }
  const shelf = resources.filter(r => r.domain === place.id && (age === "" || (Number(age) >= r.minMonths && Number(age) <= r.maxMonths)) && (place.id !== "language" || r.language === language || r.language === "Multilingual"));
  const cards: Card[] = results ?? shelf;
  const disabled = !!busy || recording || starting;

  return <section className="ar-desk" aria-label={`${place.guide}’s resource desk`}>
    <span className="aw-eyebrow">{place.title.toUpperCase()} · RESOURCE DESK</span>
    <div className="aw-guide-heading"><span className="aw-guide-initial" style={{ background: place.color }}>{place.guide[0]}</span><div><h2>{place.guide}</h2><span>{selected ? "Let’s look at this together." : "What would help your family today?"}</span></div></div>
    {!selected && <div className="ar-mode" aria-label="Resource desk options"><button disabled={disabled} aria-pressed={deskView === "browse"} onClick={() => setDeskView("browse")}><BookOpen size={17}/>Browse resources</button><button disabled={disabled} aria-pressed={deskView === "ask"} onClick={() => setDeskView("ask")}><Mic size={17}/>Ask {place.guide}</button></div>}
    {selected ? <>
      <button className="aw-text-button" disabled={disabled} onClick={() => { setSelected(null); setExplanation(null); setError(""); setNotice(""); setFollowup(""); }}><ArrowLeft size={16}/> Back to resources</button>
      <article className="ar-selected"><small>{selected.publisher} · {selected.format}</small><h3>{selected.title}</h3><p>{selected.description}</p><p className="ar-age">{selected.ageNote}</p><a className="aw-primary" href={selected.url} target="_blank" rel="noopener noreferrer">Open original resource <ArrowUpRight size={17}/></a><p className="ar-caption">Opens at the publisher. Come back here for help understanding it.</p></article>
      {explanation && <div className="ar-explanation" aria-live="polite"><span className="aw-eyebrow">{place.guide.toUpperCase()}’S SOURCE NOTES</span><p>{explanation.overview}</p><ul>{explanation.points.map((point, i) => <li key={i}>{point.text}<details><summary>See supporting words</summary><blockquote>{point.evidence}</blockquote><a href={selected.url} target="_blank" rel="noopener noreferrer">Read in the original source ↗</a></details></li>)}</ul><p className="ar-caption">{explanation.limitation}{explanation.partial ? " Only part of the page was available for this explanation." : ""}</p></div>}
    </> : <>
      <p className="ar-intro">Browse a starting shelf, or tell me what you’re looking for.</p>
      <div className="ar-filters"><label>Child’s age<select value={age} disabled={disabled} onChange={e => { setAge(e.target.value); setResults(null); }}><option value="">Choose for a closer fit</option>{ageBands.map(({value:v, label}) => <option value={v} key={v}>{label}</option>)}</select></label>{place.id === "language" && <label>Language<select value={language} disabled={disabled} onChange={e => { setLanguage(e.target.value); setResults(null); }}>{languageOptions.map(l => <option key={l}>{l}</option>)}</select></label>}</div>
    </>}
    {(selected || deskView === "ask") && <div className="ar-conversation">
      {!selected && query.length > 280 && <p className="ar-invitation">Your full transcript is below. Shorten it to 280 characters before searching ({query.length} now).</p>}
      <label className="ar-consent"><input type="checkbox" checked={voiceConsent} disabled={disabled} onChange={e => setVoiceConsent(e.target.checked)}/><span>Use voice: send this recording to Deepgram for English transcription. Athena won’t store the audio. <a href="https://developers.deepgram.com/trust-security/your-data" target="_blank" rel="noopener noreferrer">Privacy</a></span></label>
      <div className="ar-voice-row"><button className={`ar-mic ${recording ? "ar-recording" : ""}`} disabled={!voiceConsent || !!busy || starting} onClick={() => recording ? recorder.current?.stop() : startVoice()}>{recording ? <Square size={18}/> : <Mic size={20}/>} {recording ? `Finish recording · ${seconds}s` : starting ? "Opening microphone…" : "Start speaking"}</button>{disabled && <button className="ar-cancel" onClick={cancel}><X size={16}/> Cancel</button>}</div>
      {failures >= 2 && <p className="ar-invitation">Let’s try typing instead. You can edit the message below and I’ll help in the same way.</p>}
      <label className="ar-message-label" htmlFor="resource-message">{selected ? "Ask about this source, or leave blank for a summary" : "Your message · speak or type"}</label>
      <textarea id="resource-message" ref={message} value={selected ? followup : query} maxLength={selected ? 1200 : 280} disabled={disabled} onChange={e => selected ? setFollowup(e.target.value) : setQuery(e.target.value)} placeholder={selected ? "What does this suggest for a parent?" : place.id === "language" ? "Find free French songs I can learn and sing with my toddler" : "I’d like a short resource to understand this better"}/>
      {selected ? <><label className="ar-consent"><input type="checkbox" checked={explainConsent} disabled={disabled} onChange={e => setExplainConsent(e.target.checked)}/><span>Send this public link to Tavily, and its available text plus my question to Nebius AI for a source-based explanation.</span></label><button className="aw-primary" disabled={disabled || !explainConsent} onClick={explain}><BookOpen size={18}/>{explanation ? "Ask a follow-up" : "Help me understand this"}</button></> : <><label className="ar-consent"><input type="checkbox" checked={searchConsent} disabled={disabled} onChange={e => setSearchConsent(e.target.checked)}/><span>Send my message, selected age and language to Tavily to find resources. Leave out names and private details.</span></label><button className="aw-primary" disabled={disabled || !query.trim() || query.length > 280 || age === "" || !searchConsent} onClick={search}><Search size={18}/>Find resources</button></>}
      {busy && <p className="ar-status" role="status"><LoaderCircle size={17}/>{busy === "voice" ? "Listening back to your recording…" : busy === "search" ? "Looking for resources…" : "Reading the source and checking the explanation…"}</p>}
      {notice && <p className="ar-notice" role="status"><Check size={16}/>{notice}</p>}
      {error && <div className="ar-error" role="alert"><p>{error}</p>{signIn ? <a href="/auth/login?next=%2Fauth%2Fprototypes%2Fathena-world">Sign in, then return here ↗</a> : <a href="/settings">Check family AI settings ↗</a>}</div>}
    </div>}
    {!selected && deskView === "browse" && <>{notice && <p className="ar-notice" role="status">{notice}</p>}<div className="ar-shelf-heading"><h3>{results ? "Found on the web" : "A starting shelf"}</h3>{results && <button className="aw-text-button" disabled={disabled} onClick={() => { setResults(null); setNotice(""); }}>Back to shelf</button>}</div>{!cards.length && <p className="ar-empty">No checked starting resources match this selection yet. Ask {place.guide} to search for something more specific.</p>}<div className="ar-grid">{cards.map(card => <article className="ar-card" key={card.id}><button className="ar-card-open" disabled={disabled} onClick={() => { setSelected(card); setExplanation(null); setError(""); setNotice(""); }}>{card.thumbnail ? <span className="ar-thumbnail">{/* Source-provided cover; attribution is shown below. */}{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={card.thumbnail} alt={`Cover for ${card.title}`} loading="lazy" referrerPolicy="no-referrer"/></span> : <span className="ar-publisher-cover" style={{ backgroundColor: `${place.color}22` }}><BookOpen size={34}/><strong>{card.publisher}</strong><small>Athena cover · {card.format}</small></span>}<span className="ar-card-copy"><small>{card.access === "free" ? "FREE" : card.access === "mixed" ? "FREE + PAID OPTIONS" : card.access.toUpperCase()} · {card.publisher}</small><strong>{card.title}</strong><span>{card.description}</span><span className="ar-age">{card.ageNote}</span><b>Explore resource <ArrowUpRight size={16}/></b></span></button>{card.thumbnailCredit && <p className="ar-image-credit">{card.thumbnailCredit} {card.thumbnailLicenseUrl && <a href={card.thumbnailLicenseUrl} target="_blank" rel="noopener noreferrer">License</a>}</p>}</article>)}</div></>}
    <p className="ar-footnote">Resources for you to explore, not a developmental assessment or medical advice. New web results are not reviewed recommendations. Voice and live help use your signed-in family’s Guide setting and allowance. Nothing here changes your saved plan.</p>
  </section>;
}
