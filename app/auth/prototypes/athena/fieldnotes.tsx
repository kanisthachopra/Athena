"use client";
import { ArrowRight } from "lucide-react";
import { BoardCard, Intro, PlaceList, Shell, Town, useTownFlow } from "./shared";
import type { ViewProps } from "./data";

export default function Fieldnotes({ mode }: ViewProps) {
  const flow = useTownFlow();
  return <><Shell label="fieldnotes" onBoard={flow.openBoard}><div className="at-editorial-hero"><div><Intro mode={mode} /><p className="at-editorial-copy">A thoughtful resource.<br />A moment together.<br />Something new to notice.</p><button className="at-text-button" onClick={flow.openBoard}>Find today’s starting point <ArrowRight size={18} /></button></div><Town compact onPlace={flow.openPlace} /></div><div className="at-field-grid"><BoardCard onOpen={flow.openBoard} adapted={flow.adapted} /><section><p className="at-kicker">ROOM FOR EVERY KIND OF GROWTH</p><h2>Where will curiosity take you?</h2><PlaceList mode={mode} onPlace={flow.openPlace} /></section></div></Shell>{flow.modal}</>;
}
