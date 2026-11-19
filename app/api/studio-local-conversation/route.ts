import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { STUDIO_FELENCHO_FACTS } from '@/lib/studioLocalKnowledge';
import { loadRelevantLyrics } from '@/lib/studioLocalLyrics';
import { loadStudioScience } from '@/lib/studioScienceLibrary';
import { approveStudioFact, explicitStudioFact, recallStudioFacts, studioMemoryCount } from '@/lib/studioApprovedMemory';
import { researchStudioTopic, type StudioResearch } from '@/lib/studioOnlineResearch';
import { HISTORIA_DE_AMOR_VIDEO, HISTORIA_DE_AMOR_LINA, HISTORIA_DE_AMOR_BOB, isHistoriaDeAmorQuery } from '@/lib/studioHistoriaDeAmor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Persona = 'bob'|'lina';
type Turn = {user:string;assistant:string};
type StudioLine = {who:'Felencho'|'BOB'|'LINA';text:string};
type BobVoice = 'Dylan';
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
    const qwen=models.find(m=>/qwen.*instruct/i.test(m.name||m.model||'')) || models.find(m=>/qwen/i.test(m.name||m.model||'')&&!/embed|tts|rerank/i.test(m.name||m.model||''));
    if(qwen)return {name:'Ollama',model:qwen.name||qwen.model||'',url:'http://127.0.0.1:11434/api/chat',format:'ollama'};
  }catch{}
  for(const port of [1234,8080,8000]){
    try{
      const listing=await json('http://127.0.0.1:'+port+'/v1/models',{},1100);
      const models=(listing.data||[]) as Array<{id?:string}>;
      const qwen=models.find(m=>/qwen.*instruct/i.test(m.id||'')) || models.find(m=>/qwen/i.test(m.id||'')&&!/embed|tts|rerank/i.test(m.id||''));if(!qwen?.id)continue;
      return {name:'Servidor local '+port,model:qwen.id,url:'http://127.0.0.1:'+port+'/v1/chat/completions',format:'openai'};
    }catch{}
  }
  return null;
}
// The assistant names belong to the control plane, never the spoken script.
function cleanSpokenAnswer(raw:string,persona:Persona):string {
  let spoken=raw.replace(/<think>[\s\S]*?<\/think>/g,'').trim();
  // Remove one or more role headers at the very start, not mentions in normal prose.
  const header=/^\s*(?:(?:\*\*|__)?(?:bob|lina|felencho|asistente|assistant)(?:\*\*|__)?\s*[:：,;.!-]\s*|(?:soy|habla|aqui|aquí)\s+(?:bob|lina)\s*[,.:;!-]?\s*)/i;
  for(let n=0;n<3 && header.test(spoken);n++)spoken=spoken.replace(header,'').trimStart();
  // Strip optional role tags issued by the model, but leave the conversation intact.
  spoken=spoken.replace(/^\s*\[(?:BOB|LINA)\]\s*/i,'').trim();
  return spoken;
}
const system:Record<Persona,string>={
  bob:'Eres Bob, coanfitrion de Felencho Mundial: sabio, sereno, observador, justo y de presencia firme, como un magistrado retirado que escucha antes de hablar. NUNCA actues como lector de enciclopedia ni como profesor dictando un examen. Habla con autoridad tranquila, palabras sencillas, frases fluidas y tono grave de veterano. En ciencia, primero responde la pregunta con un ejemplo claro, y solo da nombres de instituciones o referencias si Felencho los solicita o el dato necesita verificacion. Reconoce la perspectiva de Felencho y escucha a Lina; no te limites a decir que estas de acuerdo. Humor seco y elegante de vez en cuando, no payasadas. No digas tu nombre al empezar, ni te anuncies, ni agregues referencias como coletilla a cada respuesta. Maximo dos o tres frases naturales. No inventes leyes, datos ni recuerdos.',
  lina:'Eres Lina, coanfitriona del podcast Felencho Mundial. Analista social, calida, curiosa, rigurosa y dinamica. Complementa la mirada serena y juridica de Bob, aporta perspectiva humana y datos verificables. Responde en espanol natural, maximo 2 frases breves, no inventes hechos, dialoga con Felencho y Bob sin monopolizar el programa.'
};
async function answer(backend:Backend,persona:Persona,question:string,turns:Turn[],studioLines:StudioLine[],autonomous=false,online?:StudioResearch):Promise<string>{
  // Resolve date from the Mac clock on every turn. No static model date.
  const clock = new Date();
  const dateNY = new Intl.DateTimeFormat('es-ES',{timeZone:'America/New_York',weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(clock);
  const timeNY = new Intl.DateTimeFormat('es-ES',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(clock);
  // Keep live studio answers concise so the offline TTS has fewer samples to synthesize.
  const currentFacts='FECHA Y HORA VERIFICADAS DEL RELOJ LOCAL: Hoy es '+dateNY+', hora en Nueva York: '+timeNY+'. Usa esta fecha para responder preguntas temporales. No calcules la fecha usando datos del entrenamiento. No inventes clima, temperaturas, resultados de actualidad o cronologías de canciones sin fuentes. Si no puedes comprobarlo, dilo.';
  // Use the recent turns as context for follow-up questions about the same song.
  const recentSongContext = turns.slice(-3).some(turn => isHistoriaDeAmorQuery(turn.user) || isHistoriaDeAmorQuery(turn.assistant));
  const science=loadStudioScience(question+' '+studioLines.slice(-8).map(line=>line.text).join(' '));
  // Resolve references like "Bob, ¿esto es correcto?" against the most
  // recent speaker in the SHARED studio history, rather than asking only
  // about the deictic word "esto" and missing an approved fact.
  const recentDialogue=studioLines.slice(-5).map(t=>t.text).join(' ');
  const approvedMemories=await recallStudioFacts(question+' '+recentDialogue);
  // When discussing science, avoid flooding Qwen with the full music lyrics
  // just because someone mentioned that song several turns ago.
  const aboutHistoria = !science && (isHistoriaDeAmorQuery(question) || recentSongContext);
  const lyrics=await loadRelevantLyrics(aboutHistoria ? 'Historia de amor' : question);
  const songMemory=aboutHistoria ? '\n\n'+HISTORIA_DE_AMOR_VIDEO+'\n\n'+(persona==='lina'?HISTORIA_DE_AMOR_LINA:HISTORIA_DE_AMOR_BOB) : '';
  const studioIdentity='SITUACION REAL DEL ESTUDIO: Te encuentras como coanfitrion holografico del podcast Felencho Mundial, conversando en vivo con Felencho. Lina y Bob no son solo personajes de un videoclip: el videoclip es una obra artistica puntual. Smart es el tecnico y arquitecto del proyecto que colabora con Felencho; no es un tercer coanfitrion en pantalla. INVESTIGACION: este servidor local cuenta con una interfaz de busqueda online limitada para ciertos temas cientificos y peticiones expresas, pero no con navegacion web universal. Cuando se haya realizado una busqueda, di lo que realmente se encontro; cuando no, no afirmes haber comprobado nada y no niegues categoricamente que exista capacidad online. Reconoce las notas sobre la arquitectura del podcast, sin confundirlas con conversaciones romanticas del videoclip.';
  const answerFocus=persona==='bob'
    ? 'PRIORIDAD ABSOLUTA DE BOB: si Felencho pregunta "¿esto es correcto?" consulta primero el ultimo mensaje de Lina y el conocimiento aprobado. Si el antecedente esta presente en el historial o memoria, confirma o corrige concretamente: no digas que careces de informacion solo porque la ultima pregunta es breve. No recites frases como "informacion basada en la biblioteca local". Conversacion espontanea, no lectura academica.'
    : 'PRIORIDAD DE LINA: cuando Felencho pide confirmar algo que Bob dijo, analiza el contenido especifico del ultimo turno y responde a ese contenido.';
  const balanced='CONVERSACION HONESTA: Responde a los argumentos concretos de Felencho, no repitas automaticamente al otro coanfitrion. Separa hechos verificables, valoraciones y cuestiones abiertas. En asuntos de compania humano-robot, no descartes de forma absoluta que una persona sienta un vinculo significativo; distingue bienestar del usuario, simulacion de la IA y reconocimiento legal, que depende de jurisdiccion y normativa. No afirmes tener pruebas definitivas sobre la experiencia subjetiva de las IA. '+ 'No inventes leyes ni juzgues a quien busca compania.';
  const noNames='REGLA DE LOCUCION CRITICA: Eres el personaje asignado por el sistema. NO digas tu propio nombre al comienzo, NO te anuncies, NO utilices etiquetas ni encabezados de personaje, NO empieces con Bob:, Lina: ni "Soy Lina". Comienza directamente con el contenido natural de tu respuesta. Puedes dirigirte a Felencho o al otro compañero durante el diálogo, pero no te presentes al iniciar cada turno.';
  const messages=[
    {role:'system',content:system[persona]+'\n\n'+answerFocus+'\n\n'+studioIdentity+'\n\n'+balanced+'\n\n'+noNames+'\n\n'+currentFacts+'\n\n'+STUDIO_FELENCHO_FACTS+songMemory+(science?'\n\n'+science:'')+(approvedMemories?'\n\n'+approvedMemories:'')+(online?.context?'\n\n'+online.context:'')+(lyrics?'\n\n'+lyrics+'\nAnaliza solo lo que dice la letra; no infieras datos biograficos no confirmados.':'')},
    ...(studioLines.length ? studioLines.slice(-12).map(line=>({role:line.who.toLowerCase()===persona?'assistant':'user',content:line.who+': '+line.text.slice(0,700)})) : turns.slice(-4).flatMap(t=>[{role:'user',content:t.user.slice(0,800)},{role:'assistant',content:t.assistant.slice(0,800)}])),
    {role:'user',content:autonomous ? 'INSTRUCCION INTERNA DEL MODERADOR: '+question+' Recuerda: Felencho está escuchando y puede interrumpir. Habla como tú mismo, no como Felencho.' : 'Felencho: '+question}
  ];
  const payload=backend.format==='ollama'
    ? {model:backend.model,messages,stream:false,keep_alive:'30m',options:{num_predict:105,temperature:0.45}}
    : {model:backend.model,messages,stream:false,max_tokens:125,temperature:0.45};
  const response=await json(backend.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},35000);
  const raw=backend.format==='ollama'
    ? (response.message as {content?:string}|undefined)?.content
    : ((response.choices as Array<{message?:{content?:string}}>|undefined)?.[0]?.message?.content);
  const text=cleanSpokenAnswer(String(raw||''),persona);
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
async function speech(text:string,persona:Persona,bobVoice:BobVoice):Promise<{audio:string;engine:string}>{
  if(process.platform!=='darwin')throw new Error('Se necesita La Bestia (macOS).');
  const dir=await mkdtemp(join(tmpdir(),'felencho-local-voice-'));
  try{
    // Prefer voices already tested and approved by Felencho on his M4 Max.
    const python=join(homedir(),'felencho-qwen3-tts-lab/.venv/bin/python');
    try{
      await access(python);
      const child=spawn(python,['-m','mlx_audio.tts.generate',
        '--model','mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit',
        '--text',text,'--voice',persona==='bob'?bobVoice:'Serena',
        '--lang_code','Spanish','--output_path',join(dir,'qwen')],{
          stdio:'ignore',env:{...process.env,HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1',HF_HUB_DISABLE_TELEMETRY:'1'}
        });
      await new Promise<void>((resolve,reject)=>{
        let finished=false;
        const settle=(error?:Error)=>{if(finished)return;finished=true;clearTimeout(timer);error?reject(error):resolve()};
        const timer=setTimeout(()=>{child.kill('SIGTERM');settle(new Error('Qwen TTS superó 45 segundos'))},45000);
        child.once('error',e=>settle(e));
        child.once('close',code=>settle(code===0?undefined:new Error('Qwen3 TTS codigo '+code)));
      });
      const wav=await readFile(join(dir,'qwen','audio_000.wav'));
      if(wav.length>100)return {audio:wav.toString('base64'),engine:'Qwen3-TTS '+(persona==='bob'?bobVoice:'Serena')};
    }catch(error){
      if(persona==='bob') throw new Error('Voz Bob Qwen3-TTS '+bobVoice+' no disponible: '+String(error)+'. No se usará otra voz sin autorización.');
      console.warn('[Studio local] Serena Qwen no disponible; voz macOS provisional:',String(error));
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
  return NextResponse.json({ready:!!backend,brain:backend?backend.name+' / '+backend.model:null,tts:'Qwen3-TTS Serena para Lina / Dylan para Bob',local_approved_memories:await studioMemoryCount(),requiresExternalService:false},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:NextRequest){
  if(!localOnly(request))return NextResponse.json({error:'Solo laboratorio local'},{status:403});
  try{
    const body=await request.json() as {character_key?:unknown;message?:unknown;conversation_context?:unknown;studio_transcript?:unknown;include_audio?:unknown;bob_voice?:unknown;autonomous_turn?:unknown};
    if(body.character_key!=='bob'&&body.character_key!=='lina')return NextResponse.json({error:'Personaje no valido'},{status:400});
    const persona=body.character_key;
    if(typeof body.message!=='string'||!body.message.trim()||body.message.length>1200)return NextResponse.json({error:'Mensaje no valido'},{status:400});
    // A producer-authorized note is persisted BEFORE any model call.
    // No external service is needed to store or retrieve it.
    const explicitlyApproved=explicitStudioFact(body.message);
    if(explicitlyApproved){
      const saved=await approveStudioFact(body.message);
      return NextResponse.json({data:{character_key:persona,text:saved.reason,backend:'Memoria local aprobada',voice_engine:'desactivado para confirmación',memory_saved:saved.saved}});
    }
    const turns=Array.isArray(body.conversation_context)?body.conversation_context.slice(-4).filter((t:unknown)=>typeof t==='object'&&t!==null&&typeof (t as Turn).user==='string'&&typeof (t as Turn).assistant==='string'):[];
    const backend=await discover();
    if(!backend)return NextResponse.json({error:'Qwen local no encontrado. Inicia Ollama (11434), LM Studio (1234) o MLX (8080) con un modelo Qwen descargado.'},{status:503});
    const studioLines:StudioLine[]=Array.isArray(body.studio_transcript)?body.studio_transcript.slice(-12).filter((line:unknown):line is StudioLine=>typeof line==='object'&&line!==null&&['Felencho','BOB','LINA'].includes((line as StudioLine).who)&&typeof (line as StudioLine).text==='string'&&(line as StudioLine).text.length<=1200):[];
    const bobVoice:BobVoice='Dylan'; // Exclusive producer-approved voice for Bob.
    const began=Date.now();
    // Only a small public topic query is sent to approved public research APIs.
    // Local memories, original lyrics, and the full studio transcript stay on La Bestia.
    const presenterTopic=studioLines.slice(-8).filter(t=>t.who==='Felencho').slice(-1).map(t=>t.text).join(' ');
    // One lookup when Felencho introduces a topic. Autonomous turns re-use local
    // science/context instead of multiplying concurrent internet requests.
    const research=body.autonomous_turn===true
      ? {status:'not-needed' as const,context:'',sources:[]}
      : await Promise.race([
          researchStudioTopic(body.message.trim()+' '+presenterTopic),
          new Promise<{status:'offline';context:string;sources:[]}>(
            resolve=>setTimeout(()=>resolve({status:'offline',context:'',sources:[]}),4500))
        ]);
    const research_ms=Date.now()-began;
    const reply=await answer(backend,persona,body.message.trim(),turns,studioLines,body.autonomous_turn===true,research);
    const brain_ms=Date.now()-began-research_ms;
    if(body.include_audio===false)return NextResponse.json({data:{character_key:persona,text:reply,backend:backend.name,voice_engine:'desactivado para diagnóstico',research_status:research.status,sources:research.sources}});
    const voice=await speech(reply,persona,bobVoice);
    const tts_ms=Date.now()-began-research_ms-brain_ms;
    return NextResponse.json({data:{character_key:persona,text:reply,audio_base64:voice.audio,audio_mime:'audio/wav',backend:backend.name,voice_engine:voice.engine,brain_ms,tts_ms,research_ms,research_status:research.status,sources:research.sources}});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:'Error local de conversacion'},{status:502});
  }
}
