// Synthetic visual fixture using the actual component. No auth, DB or provider.
// Static rendering tests layout/native disclosures, not hydrated save behavior.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url), React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(path,deps={}){const api={};const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;new Function('require','exports',js)(name=>deps[name]??require(name),api);return api;}
const helpers=load('../../lib/language-planning.ts');
let renderMode='',stateIndex=0,compact=false;
const {FamilyLanguageContexts}=load('../../components/family-language-contexts.tsx',{
  react:{...React,useState:initial=>{const index=stateIndex++;return React.useState(renderMode==='validation'&&index===0?()=>({...context,oralGoal:'x'.repeat(401)}):renderMode==='validation'&&index===6?{status:'invalid',message:'Check the marked fields. Your draft is still here; nothing was saved.',fieldErrors:{oralGoal:'Keep this to 400 characters or fewer. Your text is still here to edit.'}}:renderMode==='error'&&index===3?true:renderMode==='error'&&index===6?{status:'error',message:'We could not confirm the save. Your draft is still here; retry the same save when your connection is back.'}:renderMode==='add-error'&&index===23?true:renderMode==='add-error'&&index===21?'fr':initial);},useActionState:(action,initial)=>React.useActionState(action,renderMode==='add-error'&&stateIndex===24?{status:'error',message:'We could not confirm the addition. Your choice is still here; retry when your connection returns.'}:initial)},
  'next/navigation':{useRouter:()=>({refresh:()=>{}})},
  'next/link':{default:({href,children,...props})=>React.createElement('a',{href,...props},children)},
  '@/lib/language-planning':helpers,
  '@/app/family/languages/actions':{saveLanguageEnvironment:async()=>{throw new Error('Static synthetic preview cannot save');},addFamilyLanguage:async()=>{throw new Error('Static synthetic preview cannot save');}},
});
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const context={...helpers.emptyLanguageEnvironment(),role:'family',state:'active',oralGoal:'Talk about our day together',support:[{caregiverId:id(8),label:'Auntie',comfort:'comfortable',contact:'occasional',contexts:['A chat after lunch']}]};
const props={childId:id(1),childName:'River (fictional)',goals:[{id:id(2),language_code:'hi',environment:context,environment_revision:1},{id:id(3),language_code:'en',environment:null,environment_revision:0},{id:id(4),language_code:'ta',environment:{...helpers.emptyLanguageEnvironment(),state:'future'},environment_revision:1}],caregivers:[{id:id(8),display_name:'Auntie (fictional)'}],readOnly:false,unavailable:false};
const page=()=>`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MIRA synthetic language review</title><link rel="stylesheet" href="/style.css"><style>@font-face{font-family:Lato;src:url(/font.ttf)}body{font-family:Lato, sans-serif;background:#fcfafd;color:#332c35;margin:0}main{max-width:1050px;margin:auto;padding:20px}header{padding:16px 0;color:#65566a}button[type=submit]{pointer-events:none}</style><body><main><header>Synthetic layout fixture · no data is saved</header>${renderToStaticMarkup(React.createElement(FamilyLanguageContexts,props))}</main></body></html>`;
createServer((req,res)=>{
  if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');return res.end(readFileSync(new URL('../../tmp/language-review.css',import.meta.url)));}
  if(req.url==='/font.ttf'){res.setHeader('Content-Type','font/ttf');return res.end(readFileSync(new URL('../../app/fonts/Lato-Regular.ttf',import.meta.url)));}
  if(req.url.startsWith('/mobile')){
    const query=new URL(req.url,'http://localhost').searchParams;
    const part=query.get('part');
    const anchor=part==='goals'?`${id(2)}-oral`:part==='people'?`${id(2)}-support`:part==='moments'?`${id(2)}-0-contexts`:part==='save'?'language-save':part==='add'?'language-add':'';
    res.setHeader('Content-Type','text/html');return res.end(`<!doctype html><html><meta charset="utf-8"><title>MIRA synthetic mobile review</title><style>body{margin:0;background:#ddd}iframe{display:block;width:390px;height:650px;border:0;margin:auto;max-width:100%}</style><iframe src="/?view=${query.get('view')==='list'?'list':''}&state=${['error','add-error','validation'].includes(query.get('state'))?query.get('state'):''}#${anchor}" title="Synthetic Family language editor at 390 pixels"></iframe></html>`);
  }
  if(req.url.startsWith('/desktop')){
    res.setHeader('Content-Type','text/html');return res.end('<!doctype html><html><meta charset="utf-8"><title>MIRA synthetic 1440 CSS pixel layout, scaled overview</title><style>body{margin:0;background:#ddd}iframe{display:block;width:1440px;height:1900px;border:0;transform:scale(.4);transform-origin:top left}</style><iframe src="/?view=list" title="Synthetic desktop layout, scaled overview"></iframe></html>');
  }
  const url=new URL(req.url,'http://localhost');
  if(url.pathname!=='/'){res.writeHead(404);return res.end();}
  renderMode=['error','add-error','validation'].includes(url.searchParams.get('state'))?url.searchParams.get('state'):'';stateIndex=0;compact=url.searchParams.get('view')==='list';
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page().replace('name="family-language-contexts"',compact?'name="family-language-contexts"':'name="family-language-contexts" open').replace('<div class="language-actions">','<div id="language-save" class="language-actions">').replace('class="language-add"','id="language-add" class="language-add"'));
}).listen(51947,'127.0.0.1',()=>console.log('Synthetic language layout: http://127.0.0.1:51947/ and /mobile (no saves)'));
