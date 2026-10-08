"use client";
import { BoardCard, Intro, Mascot, PlaceList, Shell, Town, useTownFlow } from "./shared";
import type { ViewProps } from "./data";

export default function Village({ mode }: ViewProps) {
  const flow = useTownFlow();
  return <><Shell label="village" onBoard={flow.openBoard}><Intro mode={mode} /><div className="at-village-grid"><section className="at-map-region" aria-label="Town map"><Town onPlace={flow.openPlace} /><div className="at-map-caption"><span>YOUR TOWN SQUARE</span><span>Pick a building. Follow your curiosity.</span></div></section><aside><BoardCard onOpen={flow.openBoard} adapted={flow.adapted} /><div className="at-guide-note"><Mascot small /><p>“There’s no perfect pace. Let’s find yours.”<small>Athena · Your guide</small></p></div></aside></div><div className="at-mobile-places"><PlaceList mode={mode} onPlace={flow.openPlace} /></div></Shell>{flow.modal}</>;
}
