import * as T from "three";

/** Decorative wildlife never blocks travel or gates learning. Time is supplied by the world. */
export function createWildlife(parent: T.Group) {
  const cream = new T.MeshStandardMaterial({color:0xeee3cf,roughness:.9});
  const brown = new T.MeshStandardMaterial({color:0xa48664,roughness:.95});
  const orange = new T.MeshStandardMaterial({color:0xd99a46,roughness:.8});
  const dark = new T.MeshStandardMaterial({color:0x263d38,roughness:.7});
  const green = new T.MeshStandardMaterial({color:0x427569,roughness:.7});
  function oval(g:T.Object3D,x:number,y:number,z:number,sx:number,sy:number,sz:number,mat:T.Material) {
    const m=new T.Mesh(new T.SphereGeometry(1,12,8),mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;g.add(m);return m;
  }
  const rabbits=[0,1].map(i=>{
    const g=new T.Group();parent.add(g);const fur=i?brown:cream;
    oval(g,0,.32,0,.25,.3,.4,fur);oval(g,0,.56,.3,.22,.23,.23,fur);
    const ears=[oval(g,-.11,.89,.26,.07,.28,.06,fur),oval(g,.11,.89,.26,.07,.28,.06,fur)];
    ears[0].rotation.z=.15;ears[1].rotation.z=-.15;
    for(const x of [-.12,.12]){oval(g,x,.6,.49,.027,.035,.025,dark);oval(g,x,.11,.26,.12,.1,.2,fur);}
    oval(g,0,.37,-.39,.13,.13,.13,cream);oval(g,0,.49,.53,.035,.025,.025,brown);
    return {g,ears};
  });
  const ducks=[0,1].map(i=>{
    const g=new T.Group();parent.add(g);
    oval(g,0,.22,0,.25,.19,.39,cream);oval(g,0,.46,.26,.15,.18,.17,i?brown:green);
    oval(g,0,.4,.45,.13,.04,.13,orange);
    for(const x of [-.115,.115])oval(g,x,.51,.35,.018,.022,.02,dark);
    const wing=oval(g,.22,.23,-.02,.045,.11,.23,brown);
    return {g,wing};
  });
  const butterflies=[0,1,2].map(i=>{
    const g=new T.Group();parent.add(g);
    const mat=new T.MeshStandardMaterial({color:[0xd8af55,0xc0d8c3,0x9b8eaa][i],side:T.DoubleSide,roughness:.8});
    const wings=[-1,1].map(side=>{const pivot=new T.Group();g.add(pivot);const wing=oval(pivot,side*.13,0,0,.16,.025,.22,mat);wing.castShadow=false;return pivot;});
    oval(g,0,0,0,.025,.03,.16,dark);return {g,wings};
  });
  function update(time:number) {
    rabbits.forEach(({g,ears},i)=>{
      const cycle=(time+i*4)%13, running=cycle<7, a=(Math.min(cycle,7)/7)*Math.PI*2;
      const x=-6.8-i*1.7+Math.cos(a)*1.9,z=10.5+i*2+Math.sin(a)*1.35;
      g.position.set(x,.12+(running?Math.max(0,Math.sin(cycle*10))*.23:0),z);
      g.rotation.y=Math.atan2(-Math.sin(a)*1.9,Math.cos(a)*1.35);
      g.rotation.x=running?Math.sin(cycle*10)*.1:Math.sin(time*1.5)*.035;
      ears[0].rotation.x=Math.sin(time*2+i)*.09;
    });
    ducks.forEach(({g,wing},i)=>{const a=time*.22+i*Math.PI;g.position.set(6+Math.cos(a)*1.5,.13+Math.sin(time*2+i)*.025,11+Math.sin(a)*.9);g.rotation.y=Math.atan2(-Math.sin(a)*1.5,Math.cos(a)*.9);wing.rotation.z=Math.sin(time*1.8+i)*.07;});
    butterflies.forEach(({g,wings},i)=>{const a=time*.5+i*2;g.position.set(-3+Math.cos(a)*2.2,1.4+Math.sin(time+i)*.3,1+Math.sin(a)*1.8);g.rotation.y=-a;wings.forEach((w,j)=>w.rotation.z=Math.sin(time*15+i)*.8*(j?1:-1));});
  }
  update(0);
  return {update};
}
