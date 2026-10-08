"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Compass, Footprints, Map, MessageCircle, MoveUpRight, NotebookPen, PanelTop, Sparkles, Sun, X, Pause, Play, Scan, Focus, Languages, Sprout, Heart, Palette, Lightbulb } from "lucide-react";
import { places, type PlaceId, type WorldController, type WorldState } from "./world-data";
import "./world.css";
import { ResourceDesk } from "./resource-desk";

type Mode = "choose" | "world" | "focus";

export default function WorldPreview() {
  const [mode,setMode]=useState<Mode>("choose");
  const [world,setWorld]=useState<WorldState>({room:null,near:null,moving:false});
  const [panel,setPanel]=useState<string|null>(null);
  const [error,setError]=useState(false),[ready,setReady]=useState(false);
  const [focus,setFocus]=useState<PlaceId>("movement");
  const [resourceAge,setResourceAge]=useState(""),[resourceLanguage,setResourceLanguage]=useState("English");
  const [route,setRoute]=useState(false),[compare,setCompare]=useState(false);
  const [wide,setWide]=useState(false),[ambient,setAmbient]=useState(true);
  const [inputMethod,setInputMethod]=useState("pointer");
  const host=useRef<HTMLDivElement>(null),engine=useRef<WorldController|null>(null),dialog=useRef<HTMLDialogElement>(null);
  const open=useCallback((id:string)=>{setPanel(id);},[]);
  useEffect(()=>{
    if(mode!=="world"||!host.current)return;
    let cancelled=false;
    import("./engine").then(({createWorld})=>{
      if(cancelled||!host.current)return;
      try { engine.current=createWorld(host.current,setWorld,open);setReady(true); } catch {setError(true);}
    }).catch(()=>setError(true));
    return()=>{cancelled=true;engine.current?.dispose();engine.current=null;setReady(false);};
  },[mode,open]);
  useEffect(()=>{if(panel)dialog.current?.showModal();else dialog.current?.close();},[panel]);
  useEffect(()=>{engine.current?.setWide(wide);},[wide,ready]);
  useEffect(()=>{engine.current?.setAmbient(ambient);},[ambient,ready]);
  const place=places.find(p=>p.id===(panel==="board"?focus:panel));
  const currentRoom=places.find(p=>p.id===world.room);
  const nearPlace=places.find(p=>p.id===world.near);
  function changeMode(next:Mode){setPanel(null);setError(false);setMode(next);}
  function destination(id:string){if(mode==="world")engine.current?.travel(id);else open(id);}
  const actionLabel=world.near==="guide"?`Talk with ${currentRoom?.guide}`:world.near==="exit"?"Step outside":world.near==="board"?"Read your daily board":nearPlace?`Enter ${nearPlace.title}`:null;

  return <main className={`athena-world aw-${mode}`} data-input={inputMethod} onPointerDownCapture={()=>setInputMethod("pointer")} onKeyDownCapture={()=>setInputMethod("keyboard")}>
    <header className="aw-header">
      <button className="aw-brand" onClick={()=>changeMode("choose")} aria-label="Athena, choose your experience"><span className="aw-star">✦</span> athena<span className="aw-brand-line">a place to grow</span></button>
      <div className="aw-header-right"><span className="aw-preview-tag">PLAYABLE PREVIEW</span>{mode!=="choose"&&<button className="aw-mode" onClick={()=>changeMode(mode==="world"?"focus":"world")}>{mode==="world"?<PanelTop size={17}/>:<Compass size={17}/>}<span>{mode==="world"?"Switch to focused":"Enter the world"}</span></button>}</div>
    </header>

    {mode==="choose"&&<section className="aw-welcome">
      <div className="aw-welcome-copy"><span className="aw-eyebrow">YOUR TIME. YOUR WAY IN.</span><h1>A little world.<br/>A world of possibility.</h1><p>A place to find your footing, follow your curiosity and support your child. How would you like to arrive today?</p></div>
      <div className="aw-choices">
        <button className="aw-choice aw-choice-world" onClick={()=>changeMode("world")}>
          <div className="aw-choice-art" aria-hidden="true"><div className="aw-orbit"/><span className="aw-tree aw-tree-one"/><span className="aw-tree aw-tree-two"/><span className="aw-mini-house"><i/><b/></span><span className="aw-step-stones"/><Compass size={36}/></div>
          <span className="aw-choice-caption"><small>IMMERSIVE</small><strong>Take the scenic route</strong><span>Walk the village. Meet your guides.<br/>Make a little room for discovery.</span><b>Explore the world <ArrowRight size={19}/></b></span>
        </button>
        <button className="aw-choice aw-choice-focus" onClick={()=>changeMode("focus")}>
          <div className="aw-focus-art" aria-hidden="true"><div className="aw-paper"><Sun size={25}/><span>Today, a little movement.</span><i/><i/><b>One small next step ↗</b></div><span className="aw-paper-tab">01</span></div>
          <span className="aw-choice-caption"><small>FOCUSED</small><strong>Go straight to what matters</strong><span>Your plan, resources and guides.<br/>Everything close at hand.</span><b>Open my day <ArrowRight size={19}/></b></span>
        </button>
      </div>
      <p className="aw-welcome-foot">Same path. Same support. Switch whenever you like.</p>
      <p className="aw-prototype-note">Explore real resources · live help after sign-in · sample daily plan</p>
    </section>}

    {mode==="world"&&<section className="aw-play" aria-label="Playable village">
      <div ref={host} className="aw-canvas"/>
      {!ready&&!error&&<div className="aw-loading"><Compass size={28}/><p>Opening the village…</p></div>}
      {error&&<div className="aw-loading"><h2>This device couldn’t open the 3D world.</h2><button className="aw-primary" onClick={()=>changeMode("focus")}>Continue in focused mode</button></div>}
      {ready&&<>
        <div className="aw-location"><span className="aw-place-mark"><Compass size={23}/></span><div><span className="aw-eyebrow">{world.room?"COME ON IN":"YOUR LITTLE CORNER OF THE WORLD"}</span><h1>{currentRoom?.title??"The Commons"}</h1><p>{currentRoom?`${currentRoom.guide} is here. Come say hello.`:"Take your time. There’s room to explore."}</p></div></div>
        <div className="aw-quest"><span className="aw-day-icon"><Sun size={23}/></span><div><small>YOUR DAY · 01</small><strong>{route?"A gentler route":"A little movement"}</strong><button onClick={()=>{engine.current?.travel("board");}}>Find the daily board <ArrowRight size={14}/></button></div></div>
        <div className="aw-world-tools" aria-label="World comfort controls"><button aria-label={wide?"Closer view":"Wider view"} aria-pressed={wide} onClick={()=>setWide(!wide)} title={wide?"Closer camera":"Wider camera"}>{wide?<Focus size={18}/>:<Scan size={18}/>}<span>{wide?"Closer view":"Wider view"}</span></button><button aria-label={ambient?"Pause wildlife":"Resume wildlife"} aria-pressed={!ambient} onClick={()=>setAmbient(!ambient)} title={ambient?"Pause ambient animation":"Resume ambient animation"}>{ambient?<Pause size={16}/>:<Play size={16}/>}<span>{ambient?"Pause wildlife":"Resume wildlife"}</span></button></div>
        <div className="aw-world-status" role="status">{world.moving?"Walking…":actionLabel?"Something to explore nearby":"Tap a clear spot to walk there"}</div>
        <div className="aw-action-zone">{actionLabel&&<button className="aw-interact" onClick={()=>engine.current?.interact()}><span>{world.near==="guide"?<MessageCircle size={20}/>:<Footprints size={20}/>}</span>{actionLabel}<kbd>E</kbd></button>}</div>
        <div className="aw-movement" aria-label="Movement controls">{[{key:"ArrowUp",label:"Walk forward",Icon:ArrowUp},{key:"ArrowLeft",label:"Walk left",Icon:ArrowLeft},{key:"ArrowDown",label:"Walk backward",Icon:ArrowDown},{key:"ArrowRight",label:"Walk right",Icon:ArrowRight}].map(({key,label,Icon})=><button key={key} aria-label={label} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);engine.current?.key(key,true);}} onPointerUp={()=>engine.current?.key(key,false)} onPointerCancel={()=>engine.current?.key(key,false)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();engine.current?.key(key,true);}}} onKeyUp={()=>engine.current?.key(key,false)} onBlur={()=>engine.current?.key(key,false)}><Icon size={19}/></button>)}</div>
        <span className="aw-key-hint">W A S D / arrows to walk · E to interact</span>
        <nav className="aw-destinations" aria-label="World destinations">{world.room?<><button onClick={()=>engine.current?.travel("guide")}><span className="aw-destination-icon"><MessageCircle size={20}/></span>Walk to {currentRoom?.guide}</button><button onClick={()=>engine.current?.exit()}><span className="aw-destination-icon"><ArrowLeft size={20}/></span>Outside</button></>:<><span className="aw-map-badge"><Map size={21}/><small>PLACES</small></span>{places.map((p,i)=>{const Icon=[Languages,Sprout,Lightbulb,Heart,Palette][i];return <button key={p.id} onClick={()=>destination(p.id)}><span className="aw-destination-icon" style={{color:p.color}}><Icon size={22}/></span>{p.short}</button>;})}</>}</nav>
      </>}
    </section>}

    {mode==="focus"&&<section className="aw-focused">
      <div className="aw-focus-intro"><span className="aw-eyebrow">A LITTLE SPACE FOR WHAT MATTERS</span><h1>Hello, explorer.</h1><p>Your day, at your own pace.</p></div>
      <div className="aw-focused-grid"><article className="aw-day-sheet"><div className="aw-sheet-top"><span>YOUR DAY</span><span>01 / BEGIN</span></div><Sun size={32}/><h2>{route?<>A gentler way<br/>to begin.</>:<>A little movement.<br/>A little discovery.</>}</h2><p>{route?"You chose a shorter reading route. Your sample plan remembers that choice.":"Start with Movement Garden, or follow what feels useful today."}</p><button className="aw-primary" onClick={()=>open("board")}>Open today’s board <ArrowRight size={19}/></button><div className="aw-sheet-bottom"><NotebookPen size={17}/><span>A small next step is enough.</span></div></article>
        <div className="aw-directory"><div className="aw-directory-title"><h2>Your places</h2><span>GO WHERE YOU NEED</span></div>{places.map((p,i)=><button className="aw-directory-row" key={p.id} onClick={()=>open(p.id)}><span className="aw-room-seal" style={{background:p.color}}>{["Aa","↟","?","∞","✳"][i]}</span><span><strong>{p.title}</strong><small>{p.guide} · {p.detail}</small></span><MoveUpRight size={20}/></button>)}</div></div>
      <p className="aw-prototype-note">Sample plan · changes stay in this preview session</p>
    </section>}

    <dialog aria-label={panel === "board" ? "Daily board" : "Guide conversation"} className="aw-dialog" ref={dialog} onCancel={()=>setPanel(null)} onClose={()=>setPanel(null)}>
      <button className="aw-close" aria-label="Close conversation" onClick={()=>setPanel(null)}><X size={22}/></button>
      {panel==="board"?<><span className="aw-eyebrow">THE DAILY BOARD · DAY 01</span><h2>Where shall we begin?</h2><p>Choose a place for today. There’s no need to do everything.</p><div className="aw-focus-picks">{places.map(p=><button key={p.id} aria-pressed={focus===p.id} onClick={()=>setFocus(p.id)}>{p.short}</button>)}</div><div className="aw-plan-slip"><small>YOUR CURRENT PATH</small><h3>{places.find(p=>p.id===focus)?.title}</h3><p>{route?"Shorter reading first, with room to try it together.":"Explore a source, make time together, then reflect."}</p></div><button className="aw-primary" onClick={()=>{setPanel(null);destination(focus);}}>{mode==="world"?"Walk there":"Meet your guide"}<ArrowRight size={18}/></button><button className="aw-text-button" onClick={()=>setCompare(!compare)}>Compare a gentler route</button>{compare&&<div className="aw-compare"><h3>You choose the direction.</h3><p>A shorter reading route would replace the sample plan’s format preference for future visits. This preview does not infer a preference from your behaviour.</p><button className="aw-primary" onClick={()=>{setRoute(!route);setCompare(false);}}>{route?"Return to original path":"Choose shorter reading"}</button><button className="aw-text-button" onClick={()=>setCompare(false)}>Keep my current path</button></div>}</>:place&&<ResourceDesk key={place.id} place={place} age={resourceAge} setAge={setResourceAge} language={resourceLanguage} setLanguage={setResourceLanguage}/>}
    </dialog>
    {mode!=="choose"&&<span className="aw-preview-label"><Sparkles size={12}/> Resource desk + world preview</span>}
  </main>;
}
