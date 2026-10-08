"use client";
import { ArrowRight, Compass } from "lucide-react";
import { Intro, Mascot, PlaceList, Shell, Town, useTownFlow } from "./shared";
import type { ViewProps } from "./data";

export default function Trail({ mode }: ViewProps) {
  const flow = useTownFlow();
  return <><Shell label="trail" onBoard={flow.openBoard}><Intro mode={mode} /><div className="at-trail-grid"><section className="at-trail-panel"><div className="at-trail-heading"><p className="at-kicker">YOUR FIRST CHAPTER</p><h2>Start small.<br />See where it leads.</h2><p>{flow.adapted ? "Your path now begins with shorter reads." : "A resource is just the beginning. The good part happens together."}</p></div><div className="at-trail-steps"><div className="current"><span>1</span><div><h3>Find your first resource</h3><p>Choose a building to begin.</p><button className="at-primary" onClick={flow.openBoard}>Choose today’s focus<ArrowRight size={17} /></button></div></div><div><span>2</span><div><h3>Take it into your day</h3><p>Try it together, when the moment feels right.</p></div></div><div><span>3</span><div><h3>Come back with a little story</h3><p>What did you notice? Your next step starts there.</p></div></div></div></section><section className="at-trail-world"><Town compact onPlace={flow.openPlace} /><div className="at-trail-guide"><Mascot small /><p>One path, plenty of possibilities.</p></div><h2><Compass size={20} /> Explore another corner</h2><PlaceList mode={mode} onPlace={flow.openPlace} /></section></div></Shell>{flow.modal}</>;
}
