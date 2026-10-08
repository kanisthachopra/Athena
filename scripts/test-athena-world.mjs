import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../app/auth/prototypes/athena-world/navigation.ts',import.meta.url),'utf8');
const exports={};
new Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports);
const {findPath}=exports;
const boundary=(x,z)=>Math.abs(x)>10||Math.abs(z)>10;
const wall=(x,z)=>boundary(x,z)||(x===0&&z>=-3&&z<=3);
const route=findPath({x:-4,z:0},{x:4,z:0},wall);
assert.deepEqual(route.at(-1),{x:4,z:0});
assert.ok(route.some(p=>Math.abs(p.z)>3),'Must go around the wall');
let previous={x:-4,z:0};
for(const point of route){assert.equal(wall(point.x,point.z),false);assert.equal(wall(point.x,previous.z),false);assert.equal(wall(previous.x,point.z),false);previous=point;}
assert.deepEqual(findPath({x:0,z:0},{x:15,z:0},boundary),[],'Blocked target rejected');
assert.deepEqual(findPath({x:0,z:0},{x:0,z:0},boundary),[],'No movement to current cell');
assert.deepEqual(findPath({x:0,z:0},{x:2,z:2},(x,z)=>boundary(x,z)||(Math.abs(x)+Math.abs(z)===1)),[],'Cannot cut diagonally out of enclosed cell');
const buildings=[[-10,-6],[0,-11],[10,-6],[-11,6],[11,6]];
const town=(x,z)=>Math.hypot(x,z)>20.7||buildings.some(([bx,bz])=>Math.abs(x-bx)<3.2&&Math.abs(z-bz)<2.8)||(((x-6)/3.3)**2+((z-11)/2.3)**2<1);
for(const [x,z] of buildings){assert.deepEqual(findPath({x:0,z:8},{x,z:z+4},town).at(-1),{x,z:z+4},'All five building approaches reachable');}
console.log('PASS: routes avoid walls and corner cutting; blocked/enclosed targets fail; all five building approaches reachable.');
