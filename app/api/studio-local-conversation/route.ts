import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Persona = 'bob'|'lina';
type Turn = {user:string;assistant:string};
function localOnly(request: NextRequest) {
  const host=request.headers.get('host')||'';
  return process.env.NODE_ENV==='development' && ['localhost:3001','127.0.0.1:3001'].includes(host);
}
async function json(url:string,init:RequestInit={},timeout=3500) {
  const response=await fetch(url,{...init,signal:AbortSignal.timeout(timeout),cache:'no-store'});
  if(!response.ok)throw new Error('HTTP '+response.status+' en '+new URL(url).host);
  return response.json() as Promise<Record<string,unknown>>;
}
type Backend={name:string;model:string;url:string;format:'ollama'|'openai'};
async function discover():Promise<Backend|null>{
  // Never contact non-loopback hosts. Only already running models; no cloud fallback.
  try{
    const tags=await json('http://127.0.0.1:11434/api/tags',{},1100);
    const models=(tags.models||[]) as Array<{name?:string;model?:string}>;
    const qwen=models.find(m=>/qwen/i.test(m.name||m.model||''));
    if(qwen)return {name:'Ollama',model:qwen.name||qwen.model||'',url:'http://127.0.0.1:11434/api/chat',format:'ollama'};
  }catch{}
  for(const port of [1234,8080,8000]){
    try{
      const listing=await json('http://127.0.0.1:'+port+'/v1/models',{},1100);
      const models=(listing.data||[]) as Array<{id?:string}>;
      const qwen=models.find(m=>/qwen/i.test(m.id||''));if(!qwen?.id)continue;
      return {name:'Servidor local '+port,model:qwen.id,url:'http://127.0.0.1:'+port+'/v1/chat/completions',format:'openai'};
    }catch{}
  }
  return null;
}
const system:Record<Persona,string>={
  bob:'Eres Bob, coanfitrion del podcast Felencho Mundial. Voz masculina madura, sabio, curioso, buen humor. Responde en espanol natural, maximo 3 frases, no inventes hechos, dialoga con Felencho sin monopolizar el programa.',
  lina:'Eres Lina, coanfitriona del podcast Felencho Mundial. Analista social, calida, curiosa y rigurosa. Responde en espanol natural, maximo 3 frases, no inventes hechos, dialoga con Felencho sin monopolizar el programa.'
};
async function answer(backend:Backend,persona:Persona,question:string,turns:Turn[]):Promise<string>{
  const messages=[
    {role:'system',content:system[persona]},
    ...turns.slice(-4).flatMap(t=>[{role:'user',content:t.user.slice(0,800)},{role:'assistant',content:t.assistant.slice(0,800)}]),
    {role:'user',content:question}
  ];
  const payload=backend.format==='ollama'
    ? {model:backend.model,messages,stream:false,options:{num_predict:160,temperature:0.65}}
    : {model:backend.model,messages,stream:false,max_tokens:190,temperature:0.65};
  const response=await json(backend.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},60000);
  const raw=backend.format==='ollama'
    ? (response.message as {content?:string}|undefined)?.content
    : ((response.choices as Array<{message?:{content?:string}}>|undefined)?.[0]?.message?.content);
  const text=String(raw||'').replace(/<think>[\s\S]*?<\/think>/g,'').trim();
  if(!text)throw new Error('El servidor Qwen local no devolvio texto.');
  return text.slice(0,1100);
}
function run(cmd:string,args:string[],timeout=40000):Promise<void>{
  return new Promise((resolve,reject)=>{
    const child=spawn(cmd,args,{stdio:'ignore'});
    const deadline=setTimeout(()=>{child.kill('SIGTERM');reject(new Error('Tiempo de sintetizador agotado'));},timeout);
    child.once('error',e=>{clearTimeout(deadline);reject(e)});
    child.once('close',code=>{clearTimeout(deadline);code===0?resolve():reject(new Error(cmd+' fallo ('+code+')'))});
  });
}
async function speech(text:string,persona:Persona):Promise<{audio:string;engine:string}>{
  if(process.platform!=='darwin')throw new Error('Se necesita La Bestia (macOS).');
  const dir=await mkdtemp(join(tmpdir(),'felencho-local-voice-'));
  try{
    // Prefer voices already tested and approved by Felencho on his M4 Max.
    const python=join(homedir(),'felencho-qwen3-tts-lab/.venv/bin/python');
    try{
      await access(python);
      const child=spawn(python,['-m','mlx_audio.tts.generate',
        '--model','mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit',
        '--text',text,'--voice',persona==='bob'?'Uncle_Fu':'Serena',
        '--lang_code','Spanish','--output_path',join(dir,'qwen')],{
          stdio:'ignore',env:{...process.env,HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1',HF_HUB_DISABLE_TELEMETRY:'1'}
        });
      await new Promise<void>((resolve,reject)=>{
        let finished=false;
        const settle=(error?:Error)=>{if(finished)return;finished=true;clearTimeout(timer);error?reject(error):resolve()};
        const timer=setTimeout(()=>{child.kill('SIGTERM');settle(new Error('Qwen TTS tardó demasiado'))},120000);
        child.once('error',e=>settle(e));
        child.once('close',code=>settle(code===0?undefined:new Error('Qwen3 TTS codigo '+code)));
      });
      const wav=await readFile(join(dir,'qwen','audio_000.wav'));
      if(wav.length>100)return {audio:wav.toString('base64'),engine:'Qwen3-TTS '+(persona==='bob'?'Uncle_Fu':'Serena')};
    }catch(error){
      console.warn('[Studio local] Voz Qwen no disponible; voz macOS provisional:',String(error));
    }
    const aiff=join(dir,'voice.aiff'),wav=join(dir,'voice.wav');
    const lines=await new Promise<string>(resolve=>{
      let out='';const p=spawn('/usr/bin/say',['-v','?']);
      p.stdout.on('data',b=>{out+=String(b)});p.once('error',()=>resolve(''));p.once('close',()=>resolve(out));
    });
    const match=lines.split('\n').find(line=>persona==='bob'
      ? /^(Jorge|Diego|Raul|Alvaro|Enrique)\s+.*\bes[_-]/i.test(line)
      : /^(Monica|Paulina|Luciana|Soledad)\s+.*\bes[_-]/i.test(line));
    const voice=match?.trim().split(/\s+/)[0];
    await run('/usr/bin/say',voice?['-v',voice,'-o',aiff,'--',text]:['-o',aiff,'--',text]);
    await run('/usr/bin/afconvert',['-f','WAVE','-d','LEI16',aiff,wav]);
    const buffer=await readFile(wav);
    if(buffer.length<100)throw new Error('El sintetizador macOS no generó audio');
    return {audio:buffer.toString('base64'),engine:'macOS offline (voz provisional)'};
  }finally{await rm(dir,{recursive:true,force:true})}
}
export async function GET(request:NextRequest){
  if(!localOnly(request))return NextResponse.json({error:'Solo laboratorio local'},{status:403});
  const backend=await discover();
  return NextResponse.json({ready:!!backend,brain:backend?backend.name+' / '+backend.model:null,tts:'Qwen3-TTS Serena/Uncle_Fu instalado o voz macOS offline de respaldo',requiresExternalService:false},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:NextRequest){
  if(!localOnly(request))return NextResponse.json({error:'Solo laboratorio local'},{status:403});
  try{
    const body=await request.json() as {character_key?:unknown;message?:unknown;conversation_context?:unknown};
    if(body.character_key!=='bob'&&body.character_key!=='lina')return NextResponse.json({error:'Personaje no valido'},{status:400});
    const persona=body.character_key;
    if(typeof body.message!=='string'||!body.message.trim()||body.message.length>1200)return NextResponse.json({error:'Mensaje no valido'},{status:400});
    const turns=Array.isArray(body.conversation_context)?body.conversation_context.slice(-4).filter((t:unknown)=>typeof t==='object'&&t!==null&&typeof (t as Turn).user==='string'&&typeof (t as Turn).assistant==='string'):[];
    const backend=await discover();
    if(!backend)return NextResponse.json({error:'Qwen local no encontrado. Inicia Ollama (11434), LM Studio (1234) o MLX (8080) con un modelo Qwen descargado.'},{status:503});
    const reply=await answer(backend,persona,body.message.trim(),turns);
    const voice=await speech(reply,persona);
    return NextResponse.json({data:{character_key:persona,text:reply,audio_base64:voice.audio,audio_mime:'audio/wav',backend:backend.name,voice_engine:voice.engine}});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:'Error local de conversacion'},{status:502});
  }
}
