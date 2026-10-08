export type Point = { x: number; z: number };

/** Bounded eight-way A*. Rejects diagonal corner cutting and unreachable goals. */
export function findPath(start: Point, target: Point, blocked: (x: number, z: number) => boolean): Point[] {
  const sx=Math.round(start.x), sz=Math.round(start.z), tx=Math.round(target.x), tz=Math.round(target.z);
  if(blocked(tx,tz))return [];
  const key=(x:number,z:number)=>`${x},${z}`;
  const open=[{x:sx,z:sz,g:0,f:0}],costs=new Map([[key(sx,sz),0]]),parents=new Map<string,string>();
  let found=false;
  for(let n=0;open.length&&n<2200;n++) {
    open.sort((a,b)=>a.f-b.f);const current=open.shift()!;
    if(current.x===tx&&current.z===tz){found=true;break;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
      const nx=current.x+dx,nz=current.z+dz;
      if(blocked(nx,nz)||blocked(current.x+dx,current.z)||blocked(current.x,current.z+dz))continue;
      const g=current.g+Math.hypot(dx,dz),k=key(nx,nz);
      if(g>=(costs.get(k)??Infinity))continue;
      costs.set(k,g);parents.set(k,key(current.x,current.z));open.push({x:nx,z:nz,g,f:g+Math.hypot(tx-nx,tz-nz)});
    }
  }
  if(!found)return [];
  const result:Point[]=[];let k=key(tx,tz);
  while(k!==key(sx,sz)){const [x,z]=k.split(",").map(Number);result.unshift({x,z});k=parents.get(k)!;if(!k)return [];}
  return result;
}
