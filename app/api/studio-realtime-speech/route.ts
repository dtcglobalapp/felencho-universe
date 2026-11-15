import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const local=(r:NextRequest)=>process.env.NODE_ENV==='development'&&['localhost:3002','127.0.0.1:3002'].includes(r.headers.get('host')||'');
function exec(cmd:string,args:string[],signal:AbortSignal,timeout:number):Promise<void>{
 return new Promise((resolve,reject)=>{
  const child=spawn(cmd,args,{stdio:'ignore'});
  let finished=false;
  const end=(e?:Error)=>{if(finished)return;finished=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);e?reject(e):resolve();};
  const cancel=()=>{child.kill('SIGTERM');end(new Error('Síntesis cancelada'))};
  const timer=setTimeout(()=>{child.kill('SIGTERM');end(new Error('Síntesis agotó tiempo'))},timeout);
  if(signal.aborted){cancel();return}
  signal.addEventListener('abort',cancel,{once:true});
  child.once('error',e=>end(e));child.once('close',code=>end(code===0?undefined:new Error('Síntesis terminó con código '+code)));
 });
}
export async function GET(request:NextRequest){
 if(!local(request))return NextResponse.json({error:'Solo laboratorio local'},{status:403});
 try{
  const res=await fetch('http://127.0.0.1:7894/health',{signal:AbortSignal.timeout(1500),cache:'no-store'});
  if(!res.ok)throw new Error('Worker HTTP '+res.status);
  const info=await res.json() as {ok?:boolean;model?:string};
  return NextResponse.json({ready:info.ok===true,engine:'Qwen3-Persistent',model:info.model||null},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  return NextResponse.json({ready:false,engine:'Qwen3-Persistent',reason:e instanceof Error?e.message:String(e)},{headers:{'Cache-Control':'no-store'}});
 }
}
// This filter only affects Bob. Do not touch Lina/Serena.
function cleanBobSpeech(raw:string){
 return raw
  .replace(/^(?:\\s*(?:ah+|eh+|mmm+|hmm+|uf+|ja+|pues|bueno|vaya|caramba)[!,.…:;\\s-]+)+/iu,'')
  .replace(/^[\\s]*(?:Bob|Felencho)[,:;!\\s-]+/iu,'')
  .replace(/\\b([a-záéíóúüñ])\\1{3,}\\b/giu,'$1$1')
  .replace(/[.][.][.]+/g,'.')
  .trim();
}
export async function POST(request:NextRequest){
 if(!local(request))return NextResponse.json({error:'Laboratorio local puerto 3002 solamente'},{status:403});
 let body:{persona?:'bob'|'lina';text?:string;allowFallback?:boolean;bobVoice?:string};
 try{body=await request.json() as typeof body;}catch{return NextResponse.json({error:'JSON inválido'},{status:400})}
 if((body.persona!=='bob'&&body.persona!=='lina')||typeof body.text!=='string'||body.text.trim().length<3||body.text.length>350)
   return NextResponse.json({error:'Frase inválida (máximo 350 caracteres)'},{status:400});
 const cleaned=body.persona==='bob'?cleanBobSpeech(body.text):body.text.trim();
 // This selection is restricted to the experimental laboratory, never production.
 const maleVoices=new Set(['Eric','Aiden','Dylan']);
 const voice=body.persona==='lina'?'Serena':maleVoices.has(body.bobVoice||'')?body.bobVoice!:'Eric';
 if(cleaned.length<3)return NextResponse.json({error:'Texto de Bob vacío tras limpiar muletillas'},{status:422});
  if(process.platform!=='darwin')return NextResponse.json({error:'Esta prueba necesita La Bestia (macOS)'},{status:503});
 // Prefer the persistent local MLX worker; no paid APIs or additional voices.
 // If the worker is not started, retain the former per-request generator
 // for an apples-to-apples comparison in the isolated laboratory.
 const startedPersistent=performance.now();
 let persistentError='Servidor de voz persistente no disponible';
 try {
   const response=await fetch('http://127.0.0.1:7894/synthesize',{
     method:'POST',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({text:cleaned,voice}),
     signal:AbortSignal.any([request.signal,AbortSignal.timeout(25000)]),
     cache:'no-store'
   });
   if(!response.ok){persistentError='Worker HTTP '+response.status+': '+(await response.text()).slice(0,180);}
   if(response.ok){
     const audio=new Uint8Array(await response.arrayBuffer());
     if(audio.byteLength>100)return new Response(audio,{headers:{
       'Content-Type':'audio/wav','Cache-Control':'no-store',
       'X-TTS-Ms':String(Math.round(performance.now()-startedPersistent)),
       'X-TTS-Worker-Ms':response.headers.get('X-TTS-Ms')||'',
       'X-Voice':voice,
       'X-TTS-Engine':'Qwen3-Persistent'
     }});
   }
 }catch(error){
   if(request.signal.aborted)return NextResponse.json({error:'Cancelado'},{status:499});
   persistentError=error instanceof Error?error.message:String(error);
   console.warn('[Realtime Lab] Persistent voice unavailable:',persistentError);
 }
 // Never silently switch back to the slow generator during latency tests.
 // Fallback is available only when the operator explicitly opts in.
 if(body.allowFallback!==true)return NextResponse.json({
   error:'Qwen3-Persistent no responde en 127.0.0.1:7894. Revisa la terminal del worker.',
   detail:persistentError,
   engine:'Qwen3-Persistent'
 },{status:503,headers:{'Cache-Control':'no-store'}});
 const dir=await mkdtemp(join(tmpdir(),'felencho-realtime-voice-'));
 const started=performance.now();
 try{
  const python=join(homedir(),'felencho-qwen3-tts-lab/.venv/bin/python');
  await access(python);
  await exec(python,['-m','mlx_audio.tts.generate','--model','mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit',
    '--text',cleaned,'--voice',voice,'--lang_code','Spanish','--output_path',join(dir,'qwen')],request.signal,45000);
  const audio=await readFile(join(dir,'qwen','audio_000.wav'));
  if(audio.length<100)throw new Error('Audio no generado');
  return new Response(new Uint8Array(audio),{headers:{
    'Content-Type':'audio/wav','Cache-Control':'no-store','X-TTS-Ms':String(Math.round(performance.now()-started)),
    'X-Voice':voice, 'X-TTS-Engine':'Qwen3-Per-Request'
  }});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:502})}
 finally{await rm(dir,{recursive:true,force:true})}
}
