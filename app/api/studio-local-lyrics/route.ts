import {NextRequest,NextResponse} from 'next/server';
import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const LOCAL_LYRICS_DIR=join(homedir(),'Documents','FelenchoMundial','letras-aprobadas');
function authorized(request:NextRequest){
 return process.env.NODE_ENV==='development' && ['localhost:3001','127.0.0.1:3001'].includes(request.headers.get('host')||'');
}
function safeName(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 -]/g,'').trim().replace(/\s+/g,'-').slice(0,70)}
export async function GET(request:NextRequest){
 if(!authorized(request))return NextResponse.json({error:'Solo local'},{status:403});
 await mkdir(LOCAL_LYRICS_DIR,{recursive:true});
 const names=(await readdir(LOCAL_LYRICS_DIR)).filter(n=>n.endsWith('.txt')).sort();
 return NextResponse.json({titles:names.map(n=>n.replace(/\.txt$/,'')),count:names.length},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:NextRequest){
 if(!authorized(request))return NextResponse.json({error:'Solo local'},{status:403});
 try{
  const body=await request.json() as {title?:unknown;lyrics?:unknown};
  if(typeof body.title!=='string'||typeof body.lyrics!=='string'||body.lyrics.trim().length<30||body.lyrics.length>20000) return NextResponse.json({error:'Titulo o letra no valido (30-20000 caracteres)'},{status:400});
  const name=safeName(body.title);
  if(name.length<2)return NextResponse.json({error:'Titulo no valido'},{status:400});
  await mkdir(LOCAL_LYRICS_DIR,{recursive:true});
  const file=join(LOCAL_LYRICS_DIR,name+'.txt');
  // Deliberate overwrite only for producer-approved source texts.
  await writeFile(file,body.lyrics.trim()+'\n',{encoding:'utf8',mode:0o600});
  return NextResponse.json({ok:true,title:name});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'No se pudo guardar letra'},{status:500})}
}
export async function loadRelevantLyrics(question:string){
 try{
  const names=(await readdir(LOCAL_LYRICS_DIR)).filter(n=>n.endsWith('.txt'));
  const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const q=norm(question);
  const matching=names.filter(n=>q.includes(norm(n.replace(/\.txt$/,'').replace(/-/g,' ')))).slice(0,2);
  if(!matching.length)return '';
  return (await Promise.all(matching.map(async n=>{
   const content=(await readFile(join(LOCAL_LYRICS_DIR,n),'utf8')).slice(0,9000);
   return 'LETRA ORIGINAL APROBADA: '+n.replace(/\.txt$/,'')+'\n'+content;
  }))).join('\n\n');
 }catch{return ''}
}
