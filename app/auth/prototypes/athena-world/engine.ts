import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createWildlife } from "./wildlife";
import { findPath } from "./navigation";
import { places, type PlaceId, type WorldController, type WorldState } from "./world-data";

/** A self-contained, synthetic world. No family data, provider calls or persistence. */
export function createWorld(host: HTMLElement, report: (state: WorldState) => void, action: (id: string) => void): WorldController {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0xc5dcd3);
  renderer.domElement.setAttribute("aria-label", "Explorable Athena world. Use arrow keys or WASD to walk. E interacts. Destination buttons also provide access.");
  renderer.domElement.tabIndex=0;
  host.appendChild(renderer.domElement);
  const scene = new T.Scene();
  scene.fog = new T.Fog(0xc5dcd3, 38, 75);
  const camera = new T.PerspectiveCamera(48, 1, .1, 100);
  const outside = new T.Group(), inside = new T.Group();
  scene.add(outside, inside); inside.visible = false;
  scene.add(new T.HemisphereLight(0xfff7e4, 0x6b8568, 2));
  const sun = new T.DirectionalLight(0xffedcf, 2.8);
  sun.position.set(-12, 24, 14); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 25, bottom: -25, far: 80 });
  sun.shadow.normalBias = .04; scene.add(sun);
  const materials: T.Material[] = [], textures: T.Texture[] = [];
  let seed = 51;
  function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function material(color: T.ColorRepresentation, roughness = .9) {
    const m = new T.MeshStandardMaterial({ color, roughness }); materials.push(m); return m;
  }
  function grain(base: string, kind: "wood" | "stone" | "grass" | "roof") {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const ctx = c.getContext("2d")!; ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2400; i++) {
      ctx.fillStyle = `rgba(${rand() > .5 ? "255,245,211" : "30,45,25"},${rand() * .12})`;
      ctx.fillRect(rand() * 256, rand() * 256, kind === "wood" ? 20 + rand() * 60 : 1 + rand() * 4, kind === "grass" ? 4 : 1);
    }
    if (kind === "wood") { ctx.strokeStyle = "#574b3a45"; for (let y = 0; y < 256; y += 32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(256,y); ctx.stroke(); } }
    if (kind === "roof") {
      for(let y=0;y<256;y+=32) for(let x=-32;x<256;x+=64){const shift=(y/32)%2*32;ctx.fillStyle=`rgba(255,244,210,${rand()*.13})`;ctx.fillRect(x+shift+2,y+2,60,28);ctx.strokeStyle="#18392f60";ctx.lineWidth=2;ctx.strokeRect(x+shift,y,64,32);ctx.fillStyle="#ffffff26";ctx.fillRect(x+shift+2,y+2,60,2);}
    }
    const texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace; texture.wrapS = texture.wrapT = T.RepeatWrapping; textures.push(texture);
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const m = new T.MeshStandardMaterial({ map: texture, bumpMap:texture, bumpScale:kind==="roof"?.1:.035, roughness: .92 }); materials.push(m); return m;
  }
  const wood = grain("#a2865c", "wood"), plaster = grain("#eddfbe", "stone"), grass = grain("#92aa78", "grass"), pathMat = grain("#d9c8a2", "stone");
  const dark = material(0x34564d), cream = material(0xffedc1), stone = material(0x99a397), leaf = [material(0x668754), material(0x7c9859), material(0x426d55)];
  const geometryCache=new Map<string,T.BufferGeometry>();
  function box(parent: T.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, mat: T.Material) {
    const key=`${w},${h},${d}`;
    let geometry=geometryCache.get(key);
    if(!geometry){geometry=w*h*d>.12?new RoundedBoxGeometry(w,h,d,1,Math.min(.09,w*.12,h*.12,d*.12)):new T.BoxGeometry(w,h,d);geometryCache.set(key,geometry);}
    const mesh = new T.Mesh(geometry,mat); mesh.position.set(x,y,z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function sphere(parent: T.Object3D, x: number, y: number, z: number, radius: number, mat: T.Material, scale = 1) {
    const mesh = new T.Mesh(new T.SphereGeometry(radius,16,12),mat); mesh.position.set(x,y,z); mesh.scale.y = scale; mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(parent: T.Object3D, x: number,y: number,z: number,r: number,h: number,mat: T.Material) {
    const mesh = new T.Mesh(new T.CylinderGeometry(r,r,h,16),mat); mesh.position.set(x,y,z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function label(parent: T.Object3D, text: string, x: number,y: number,z: number,width = 4) {
    const c = document.createElement("canvas"); c.width = 768; c.height = 160;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#f7eedb"; ctx.beginPath(); ctx.roundRect(4,4,760,152,25); ctx.fill();
    ctx.strokeStyle = "#385e50"; ctx.lineWidth = 7; ctx.stroke();
    ctx.fillStyle = "#284d41"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "600 48px Georgia"; ctx.fillText(text,384,82,715);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; textures.push(tex);
    const mat = new T.SpriteMaterial({ map: tex, depthTest: true }); materials.push(mat);
    const s = new T.Sprite(mat); s.position.set(x,y,z); s.scale.set(width,width * 160/768,1); parent.add(s); return s;
  }
  // An island with a visible cut edge, paths made from individual stones, and physical buildings.
  cylinder(outside,0,-.65,0,22,1.1,material(0x667c57));
  cylinder(outside,0,-.08,0,21.8,.2,grass);
  cylinder(outside,0,.055,1,5,.12,pathMat);
  const obstacles: { x: number; z: number; w: number; d: number }[] = [];
  function pathTo(x: number,z: number) {
    const start = new T.Vector3(0,0,1), end = new T.Vector3(x,0,z);
    const count = Math.ceil(start.distanceTo(end) / .8);
    for (let i=0;i<=count;i++) { const p = start.clone().lerp(end,i/count); const tile = box(outside,p.x,.06,p.z,1.65,.1,.7,pathMat); tile.rotation.y = Math.atan2(x,z-1); }
  }
  for (const p of places) {
    pathTo(p.x,p.z+3.5);
    const g = new T.Group(); g.position.set(p.x,0,p.z); outside.add(g);
    box(g,0,.2,0,5.5,.4,4.8,stone); box(g,0,1.8,0,5,3.2,4.2,plaster);
    const roofMaterial=grain(`#${p.roof.toString(16).padStart(6,"0")}`,"roof");
    const gableShape=new T.Shape();gableShape.moveTo(-2.5,0);gableShape.lineTo(2.5,0);gableShape.lineTo(0,1.4);gableShape.closePath();
    const gable=new T.Mesh(new T.ExtrudeGeometry(gableShape,{depth:4.2,bevelEnabled:false}),plaster);gable.position.set(0,3.35,-2.1);gable.castShadow=true;g.add(gable);
    for(const side of [-1,1]){const roof=box(g,side*1.45,4.02,0,3.4,.2,5,roofMaterial);roof.rotation.z=-side*Math.atan2(1.4,2.9);const trim=box(g,side*1.45,3.95,2.54,3.4,.19,.16,cream);trim.rotation.z=roof.rotation.z;}
    const ridge=cylinder(g,0,4.76,0,.13,5.15,roofMaterial);ridge.rotation.x=Math.PI/2;
    box(g,0,.5,2.17,5.1,.24,.2,cream);
    for(const x of [-2.4,2.4])box(g,x,1.9,2.17,.23,2.8,.18,cream);
    box(g,0,1.25,2.13,1.25,2.3,.14,dark); box(g,0,1.25,2.24,.85,1.85,.12,wood);
    sphere(g,.3,1.25,2.34,.065,cream);
    for (const x of [-1.65,1.65]) {
      box(g,x,2,2.16,.9,1.1,.12,wood); box(g,x,2,2.24,.7,.88,.08,material(0xc2dbd2));
      box(g,x,2,2.3,.05,.9,.04,cream); box(g,x,2,2.3,.74,.05,.04,cream);
      for(const side of [-1,1]){box(g,x+side*.62,2,2.2,.28,1.16,.14,dark);for(let s=0;s<4;s++)box(g,x+side*.62,1.65+s*.22,2.3,.24,.04,.06,wood);}
      box(g,x,1.35,2.35,1.1,.27,.4,wood);
      for(let j=0;j<4;j++) sphere(g,x-.35+j*.23,1.58,2.4,.16,leaf[j%3]);
    }
    box(g,0,.17,2.75,2.1,.25,.85,stone);
    label(g,p.title,0,3.12,2.5,3.7);
    obstacles.push({x:p.x,z:p.z,w:5.8,d:5});
    // Hanging lantern and chimney make each cottage a tangible place.
    box(g,1,4,-.8,.6,2,.65,plaster); box(g,1,5,-.8,.8,.15,.8,stone);
    box(g,-.95,2.4,2.45,.23,.4,.25,cream);
    if(p.id==="language") {
      box(g,-2.6,1.1,1,1,.15,1.5,wood);
      for(let i=0;i<5;i++)box(g,-2.6,1.25+i*.13,1,.65,.12,.8,material(i%2?0xa0b59c:0xbc9b67));
    } else if(p.id==="movement") {
      for(const dx of [-3.5,3.5]) {box(g,dx,1.3,1,.18,2.6,.18,wood);sphere(g,dx,2.6,1,.45,leaf[1]);}
      box(g,0,2.6,3.35,6.9,.15,.3,wood);
      for(let i=0;i<6;i++)sphere(g,-2.9+i*1.15,2.7,3.35,.35,leaf[i%3]);
    } else if(p.id==="discovery") {
      const wheel=new T.Mesh(new T.TorusGeometry(.55,.12,6,12),wood);wheel.position.set(2.7,1.4,2);g.add(wheel);
      box(g,3.2,.5,.8,1.2,1,1.1,wood);
    } else if(p.id==="connection") {
      box(g,-3.1,.5,1,1.1,.15,1.1,wood);box(g,-3.1,.9,.5,1.1,.75,.12,wood);
      sphere(g,-3.1,.65,1,.38,cream,.4);
    } else {
      box(g,3,1.1,1,.12,2.2,.12,wood);box(g,3,1.65,1,1.1,1,.15,cream);
      sphere(g,3,1.65,1.15,.3,material(0xc89350),.85);
    }
  }
  const crowns:T.Group[]=[];
  function tree(x: number,z: number, size: number) {
    cylinder(outside,x,size*.75,z,.18,size*1.5,wood);
    const crown=new T.Group();crown.position.set(x,size*1.45,z);outside.add(crown);crowns.push(crown);
    sphere(crown,0,size*.4,0,size,leaf[Math.floor(rand()*3)],1.1);
    sphere(crown,size*.6,0,.2,size*.65,leaf[1]);
    sphere(crown,-size*.55,size*.2,-.25,size*.6,leaf[2]);
  }
  for(let i=0;i<35;i++) { const angle=i/35*Math.PI*2; const radius=18+rand()*2; tree(Math.cos(angle)*radius,Math.sin(angle)*radius, .8+rand()*.6); }
  // Bench, books, a pond and flowers are deliberately authored geometry, not a backdrop.
  for(const x of [-4,4]) { box(outside,x,.55,5,2.2,.18,.7,wood); box(outside,x,.95,5.3,2.2,.65,.12,wood); for(const dx of [-.8,.8]) box(outside,x+dx,.3,5,.14,.6,.6,dark); }
  const pond = cylinder(outside,6,.06,11,2.8,.12,material(0x71a7a6,.24)); pond.scale.z = .65;
  for(let i=0;i<17;i++) { const a=i/17*Math.PI*2; sphere(outside,6+Math.cos(a)*2.85,.13,11+Math.sin(a)*1.85,.34,stone,.55); }
  for(let i=0;i<95;i++) { const x=(rand()-.5)*34,z=(rand()-.5)*32; if (Math.hypot(x,z)<7 || obstacles.some(o=>Math.abs(o.x-x)<3.5&&Math.abs(o.z-z)<3.7)) continue; sphere(outside,x,.15,z,.09, i%3===0?cream:leaf[1],1.7); }
  const wildlife=createWildlife(outside);
  const ripples=[1.15,1.65,2.1].map(r=>{const mesh=new T.Mesh(new T.TorusGeometry(r,.012,4,48),material(0xb6d7cc,.3));mesh.rotation.x=Math.PI/2;mesh.scale.y=.6;mesh.position.set(6,.15,11);outside.add(mesh);return mesh;});
  // Daily noticeboard.
  for(const x of [-.85,.85]) box(outside,x,.95,3.7,.13,1.9,.15,wood);
  box(outside,0,1.7,3.7,2.2,1.3,.2,dark); box(outside,0,1.7,3.84,1.85,1,.02,cream);
  for(let i=0;i<3;i++) box(outside,-.55+i*.55,1.7,3.88,.4,.62,.02,material(i===0?0xd5b464:0xb7c8aa));
  label(outside,"Your daily board",0,2.8,3.7,3.2);
  function person(parent: T.Object3D, color: T.ColorRepresentation, skin: T.ColorRepresentation, hairColor: T.ColorRepresentation) {
    const g = new T.Group(); parent.add(g);
    const shirt=material(color), skinMat=material(skin), hair=material(hairColor), trouser=material(0x354d49);
    const torso=box(g,0,1.03,0,.58,.68,.36,shirt);
    sphere(g,0,1.62,0,.265,skinMat,1.12); sphere(g,0,1.8,-.04,.267,hair,.65);
    sphere(g,0,1.59,.26,.055,skinMat,.8);
    for(const x of [-.26,.26])sphere(g,x,1.6,0,.055,skinMat,1.15);
    for (const x of [-.09,.09]) sphere(g,x,1.58,.26,.027,dark);
    const legs=[-.16,.16].map(x=>{const pivot=new T.Group();pivot.position.set(x,.72,0);g.add(pivot);box(pivot,0,-.32,0,.22,.65,.25,trouser);box(pivot,0,-.65,.07,.26,.18,.41,dark);return pivot;});
    const arms=[-.39,.39].map(x=>{const pivot=new T.Group();pivot.position.set(x,1.29,0);g.add(pivot);box(pivot,0,-.23,0,.19,.5,.22,shirt);sphere(pivot,0,-.52,0,.1,skinMat,1.1);return pivot;});
    return {g,legs,arms,torso};
  }
  const player=person(scene,0xc89d51,0xc58a61,0x443b30);
  player.g.position.set(0,.15,8);
  player.g.rotation.y=Math.PI;player.g.scale.setScalar(1.08);
  // Backpack keeps the adult explorer readable from the following camera.
  box(player.g,0,1,-.26,.45,.5,.18,dark);
  const athena=new T.Group();scene.add(athena);
  const starShape=new T.Shape();
  for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.22:.48;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)starShape.moveTo(x,y);else starShape.lineTo(x,y);}starShape.closePath();
  const star=new T.Mesh(new T.ExtrudeGeometry(starShape,{depth:.13,bevelEnabled:true,bevelThickness:.07,bevelSize:.065,bevelSegments:2,steps:1}),material(0xd9ac53));star.castShadow=true;athena.add(star);
  sphere(athena,-.11,.045,.22,.035,dark);sphere(athena,.11,.045,.22,.035,dark);
  box(athena,0,-.17,.15,.43,.11,.12,material(0x4c8072));athena.position.set(1.2,1.7,8.2);
  const npc=person(inside,0x527970,0xb87e56,0x484139);
  npc.g.position.set(0,.15,-1.5);
  const guideLabels=places.map(p=>{const s=label(inside,p.guide,0,2.7,-1.5,2.2);s.visible=false;return s;});
  box(inside,0,-.1,0,13,.25,12,wood);
  box(inside,0,2,-6,13,4,.2,plaster); box(inside,-6.5,1.7,0,.2,3.4,12,plaster);
  box(inside,6.5,.6,0,.2,1.2,12,plaster);
  box(inside,0,.2,-5.83,12.9,.3,.2,dark);box(inside,-6.32,.2,0,.2,.3,12,dark);
  box(inside,0,4,-5.9,13.15,.25,.4,wood);box(inside,-6.4,3.4,0,.35,.25,12,wood);
  for(const x of [-6.2,0,6.2])box(inside,x,2,-5.82,.18,4,.2,wood);
  box(inside,0,2.5,-5.75,2.8,1.8,.12,wood);box(inside,0,2.5,-5.65,2.5,1.5,.08,material(0xaccac6));
  box(inside,0,2.5,-5.55,.09,1.6,.1,cream);box(inside,0,2.5,-5.55,2.5,.08,.1,cream);
  for (const x of [-4.5,4.5]) {
    box(inside,x,1.7,-5.55,2.6,3.4,.55,dark);
    for(let s=0;s<4;s++) { box(inside,x,.5+s*.75,-5.15,2.6,.08,.9,wood); for(let b=0;b<7;b++) box(inside,x-1+b*.31,.77+s*.75,-5.25,.2,.45+rand()*.15,.45,material([0x769080,0xc49d5e,0xdacb9f,0x9a7562][b%4])); }
  }
  box(inside,0,.1,-1,4,.06,4,material(0xb4c3a1));
  box(inside,0,.14,-1,3.65,.015,3.65,material(0xc6d0ac));
  box(inside,3,.9,0,2.5,.15,1.4,wood); for(const x of [2,4]) box(inside,x,.45,0,.12,.9,1.1,wood);
  for(let i=0;i<3;i++) box(inside,2.4+i*.5,1.02,0,.4,.08,.6,cream);
  label(inside,"Return to the square",0,1,5.1,3.3);
  const ring = new T.Mesh(new T.RingGeometry(.32,.42,32),new T.MeshBasicMaterial({ color:0xffe8a5, side:T.DoubleSide })); ring.rotation.x=-Math.PI/2; ring.position.y=.19; ring.visible=false; scene.add(ring); materials.push(ring.material);
  let room: PlaceId|null=null, near: string|null=null, route: T.Vector3[]=[], previous="", disposed=false, frame=0, last=performance.now(), gait=0;
  let ambientEnabled=true,ambientTime=0,wide=false,speed=0,lastShadow=0;
  const keys=new Set<string>();
  const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
  function blocked(x: number,z: number) {
    if(room) return Math.abs(x)>5.7 || Math.abs(z)>5.2 || (x>1.5&&x<4.6&&Math.abs(z)<1);
    return Math.hypot(x,z)>20.7 || obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.3 && Math.abs(z-o.z)<o.d/2+.3) || (((x-6)/3.3)**2+((z-11)/2.3)**2<1);
  }
  // Grid A* makes tap-to-walk and destination controls route around cottages and water.
  function walkTo(x: number,z: number) {
    const result=findPath(player.g.position,{x,z},blocked);
    if(!result.length)return;
    route=result.map(p=>new T.Vector3(p.x,.15,p.z));
    ring.position.set(Math.round(x),.19,Math.round(z));ring.visible=true;
  }
  function exitRoom() { if(!room)return; const p=places.find(p=>p.id===room)!; room=null;inside.visible=false;outside.visible=true;player.g.position.set(p.x,.15,p.z+4.5);route=[];near=null;camera.position.copy(player.g.position).add(new T.Vector3(0,6.8,10.8)); }
  function interact() {
    if(!near)return;
    if(near==="exit"){exitRoom();return;}
    if(near==="guide"){action(room!);return;}
    if(near==="board"){action("board");return;}
    room=near as PlaceId;guideLabels.forEach((s,i)=>s.visible=places[i].id===room);outside.visible=false;inside.visible=true;player.g.position.set(0,.15,3.7);player.g.rotation.y=Math.PI;route=[];near=null;
    camera.position.set(0,7,13);
  }
  function travel(id:string) {
    if(id==="guide"&&room){walkTo(0,.5);return;}
    if(id==="exit"){exitRoom();return;}
    if(room)exitRoom();
    if(id==="board"){walkTo(0,5.5);return;}
    const p=places.find(p=>p.id===id);if(p)walkTo(p.x,p.z+4);
  }
  const ray = new T.Raycaster(), pointer=new T.Vector2(), plane=new T.Plane(new T.Vector3(0,1,0),-.15);
  let downX=0,downY=0;
  const pointerDown=(e:PointerEvent)=>{renderer.domElement.focus({preventScroll:true});downX=e.clientX;downY=e.clientY;};
  const pointerUp=(e:PointerEvent)=>{if(Math.hypot(e.clientX-downX,e.clientY-downY)>12)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const point=new T.Vector3();if(ray.ray.intersectPlane(plane,point))walkTo(point.x,point.z);};
  renderer.domElement.addEventListener("pointerdown",pointerDown);renderer.domElement.addEventListener("pointerup",pointerUp);
  function key(k:string,down:boolean){k=k.toLowerCase();if(down){if(k==="e"){interact();return;}keys.add(k);route=[];}else keys.delete(k);}
  const onKeyDown=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest("input,textarea,select,dialog,[role=dialog]"))return;if(["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d","e"].includes(e.key.toLowerCase())){e.preventDefault();key(e.key,true);}};
  const onKeyUp=(e:KeyboardEvent)=>key(e.key,false),blur=()=>keys.clear();
  window.addEventListener("keydown",onKeyDown);window.addEventListener("keyup",onKeyUp);window.addEventListener("blur",blur);
  const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});resize.observe(host);
  camera.position.set(0,6.95,18.8);
  const desired=new T.Vector3(),companionTarget=new T.Vector3(),direction=new T.Vector3();
  function tick(now:number){
    if(disposed)return;frame=requestAnimationFrame(tick);
    // Cap the village at 30 fps and shadow updates at 10 fps, leaving time for UI/input.
    if(now-last<1000/30)return;
    const dt=Math.min((now-last)/1000,.05);last=now;
    if(document.hidden)return;
    const dir=direction.set(Number(keys.has("d")||keys.has("arrowright"))-Number(keys.has("a")||keys.has("arrowleft")),0,Number(keys.has("s")||keys.has("arrowdown"))-Number(keys.has("w")||keys.has("arrowup")));
    if(!dir.lengthSq()&&route.length){while(route.length&&Math.hypot(route[0].x-player.g.position.x,route[0].z-player.g.position.z)<.18)route.shift();if(route.length){dir.copy(route[0]).sub(player.g.position);dir.y=0;}}
    const moving=dir.lengthSq()>.001;
    speed=T.MathUtils.damp(speed,moving?4:0,12,dt);
    if(moving){dir.normalize();const nx=player.g.position.x+dir.x*speed*dt,nz=player.g.position.z+dir.z*speed*dt;
      if(!blocked(nx,player.g.position.z))player.g.position.x=nx;
      if(!blocked(player.g.position.x,nz))player.g.position.z=nz;
      const angle=Math.atan2(dir.x,dir.z),delta=Math.atan2(Math.sin(angle-player.g.rotation.y),Math.cos(angle-player.g.rotation.y));
      player.g.rotation.y+=delta*(motion.matches?1:1-Math.exp(-dt*14));gait+=dt*speed*2.5;
    }
    for(let i=0;i<2;i++){const swing=moving&&!motion.matches?Math.sin(gait+i*Math.PI)*.48:0;player.legs[i].rotation.x=T.MathUtils.damp(player.legs[i].rotation.x,swing,18,dt);player.arms[i].rotation.x=-player.legs[i].rotation.x*.7;}
    player.g.position.y=.15+(moving&&!motion.matches?Math.abs(Math.sin(gait))*.035:0);
    player.torso.rotation.z=moving&&!motion.matches?Math.sin(gait)*.025:0;
    if(ambientEnabled&&!motion.matches){ambientTime+=dt;wildlife.update(ambientTime);crowns.forEach((c,i)=>{c.rotation.z=Math.sin(ambientTime*.7+i)*.017;});ripples.forEach((r,i)=>{const s=1+Math.sin(ambientTime*1.4+i)*.07;r.scale.set(s,s*.6,1);});npc.torso.scale.y=1+Math.sin(ambientTime*1.8)*.008;npc.arms[1].rotation.x=near==="guide"?-.3+Math.sin(ambientTime*2)*.08:0;}
    ring.visible=route.length>0;
    near=null;const pos=player.g.position;
    if(room){if(pos.distanceTo(npc.g.position)<2.7)near="guide";else if(pos.z>3.7)near="exit";}
    else {for(const p of places)if(Math.hypot(pos.x-p.x,pos.z-(p.z+3.3))<2.1)near=p.id;if(Math.hypot(pos.x,pos.z-3.7)<2.6)near="board";}
    const state={room,near,moving},serialized=JSON.stringify(state);if(serialized!==previous){previous=serialized;report(state);}
    companionTarget.set(pos.x+1.2,1.7+(ambientEnabled&&!motion.matches?Math.sin(ambientTime*2)*.08:0),pos.z+.2);
    athena.position.lerp(companionTarget,motion.matches?1:1-Math.exp(-dt*6));
    athena.rotation.z=ambientEnabled&&!motion.matches?Math.sin(ambientTime*1.5)*.06:0;
    const distance=wide?1.42:1;
    desired.set(pos.x,6.95*distance,pos.z+10.8*distance);if(room)desired.set(pos.x*.55,6.6*distance,10.8*distance+pos.z*.5);
    camera.position.lerp(desired,motion.matches?1:1-Math.exp(-dt*6));camera.lookAt(pos.x,1.05,pos.z-2.5);
    if(now-lastShadow>100){renderer.shadowMap.needsUpdate=true;lastShadow=now;}
    renderer.render(scene,camera);
  }
  frame=requestAnimationFrame(tick);
  return {travel,interact,exit:exitRoom,key,setWide(value){wide=value;},setAmbient(value){ambientEnabled=value;},dispose(){disposed=true;cancelAnimationFrame(frame);resize.disconnect();window.removeEventListener("keydown",onKeyDown);window.removeEventListener("keyup",onKeyUp);window.removeEventListener("blur",blur);renderer.domElement.removeEventListener("pointerdown",pointerDown);renderer.domElement.removeEventListener("pointerup",pointerUp);const disposedGeometry=new Set<T.BufferGeometry>(),disposedMaterials=new Set<T.Material>(materials);scene.traverse(o=>{if(o instanceof T.Mesh){disposedGeometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])disposedMaterials.add(m);}});disposedGeometry.forEach(g=>g.dispose());disposedMaterials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();}};
}
