// Actual server component, synthetic reports, no auth/database/AI or mutations.
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const api={};const code=ts.transpileModule(readFileSync(new URL('../../components/week-language-contexts.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
new Function('require','exports',code)(name=>name==='next/link'?{default:({href,children,...props})=>React.createElement('a',{href,...props},children)}:require(name),api);
const context={status:'available',hasSavedLanguages:true,opportunities:[{goalId:'a',language:'Hindi',variety:null,state:'active',people:[{name:'Auntie (fictional)',contact:'occasional',moments:['A chat after lunch','घर की बातें — وقت القصة']}]},{goalId:'b',language:'English',variety:'Family words, stories and everyday conversation',state:'maintenance',people:[{name:'A familiar person (fictional)',contact:'regular',moments:['A story we already know']}]}]};
const page=(state='expanded')=>{
  const value=state==='error'?{...context,status:'unavailable',opportunities:[]}:state==='empty'?{...context,opportunities:[]}:context;
  let content=renderToStaticMarkup(React.createElement(api.WeekLanguageContexts,{context:value,readOnly:false}));
  if(state==='expanded')content=content.replace('<details class="mt-2">','<details class="mt-2" open>').replace('name="week-language-contexts"','name="week-language-contexts" open');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic Week language review</title><link rel="stylesheet" href="/style.css"><style>@font-face{font-family:Lato;src:url(/font.ttf)}body{font-family:Lato,sans-serif;margin:0;background:#fcfafd;color:#332c35}main{max-width:1050px;margin:auto;padding:20px}header{margin-bottom:24px}</style><body><main><header>Synthetic Week section · no data is saved</header>${content}<h2 class="text-xl font-semibold">Your week continues here</h2><p class="language-note">The day board is separate from these current Family notes.</p></main></body></html>`;
};
createServer((req,res)=>{
  if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');return res.end(readFileSync(new URL('../../tmp/language-review.css',import.meta.url)));}
  if(req.url==='/font.ttf'){res.setHeader('Content-Type','font/ttf');return res.end(readFileSync(new URL('../../app/fonts/Lato-Regular.ttf',import.meta.url)));}
  const url=new URL(req.url,'http://localhost');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  if(url.pathname==='/mobile')return res.end('<!doctype html><html><meta charset="utf-8"><title>Synthetic 390px Week language review</title><style>body{margin:0;background:#ddd}iframe{display:block;width:390px;height:720px;border:0;max-width:100%;margin:auto}</style><iframe src="/" title="Synthetic Week language section, 390 CSS pixels"></iframe></html>');
  if(url.pathname==='/desktop')return res.end('<!doctype html><html><meta charset="utf-8"><title>Synthetic 1440px scaled composition</title><style>body{margin:0}iframe{display:block;width:1440px;height:1800px;transform:scale(.4);transform-origin:top left;border:0}</style><iframe src="/" title="Synthetic Week section, 1440 CSS pixels scaled"></iframe></html>');
  if(url.pathname!=='/'){res.writeHead(404);return res.end();}
  res.end(page(url.searchParams.get('state')??'expanded'));
}).listen(51948,'127.0.0.1',()=>console.log('Synthetic Week review at http://127.0.0.1:51948/ (no saves)'));
