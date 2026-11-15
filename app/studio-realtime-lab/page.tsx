'use client';
import { useEffect,useRef,useState } from 'react';
type Persona='bob'|'lina';
type Evt={type:string;text?:string;model?:string;total_ms?:number;message?:string};
const sec=(v:number|null)=>v===null?'—':(v/1000).toFixed(2)+' s';
export default function RealtimeLab(){
 const [persona,setPersona]=useState<Persona>('bob');
 const [question,setQuestion]=useState('Explica qué hacen las células gliales en el cerebro.');
 const [transcript,setTranscript]=useState('');
 const [answer,setAnswer]=useState('');
 const [status,setStatus]=useState('Prueba hablada lista. No afecta los hologramas.');
 const [recording,setRecording]=useState(false);
 const [busy,setBusy]=useState(false);
 const [times,setTimes]=useState<{stt:number|null;firstText:number|null;tts:number|null;firstVoice:number|null;total:number|null}>({stt:null,firstText:null,tts:null,firstVoice:null,total:null});
 const [voice,setVoice]=useState('');
 const [engine,setEngine]=useState('');
 const [worker,setWorker]=useState<'checking'|'ready'|'offline'>('checking');
 const rec=useRef<MediaRecorder|null>(null);
 const mic=useRef<MediaStream|null>(null);
 const abort=useRef<AbortController|null>(null);
 const ttsAbort=useRef<AbortController|null>(null);
 const player=useRef<HTMLAudioElement|null>(null);
 const mark=useRef(0);
 const checkWorker=async()=>{
   try{
     const response=await fetch('/api/studio-realtime-speech',{cache:'no-store'});
     const body=await response.json() as {ready?:boolean};
     setWorker(body.ready?'ready':'offline');
   }catch{setWorker('offline');}
 };
 useEffect(()=>{void checkWorker();const timer=setInterval(()=>void checkWorker(),5000);return()=>clearInterval(timer);},[]);
  const stop=()=>{abort.current?.abort();ttsAbort.current?.abort();player.current?.pause();setBusy(false);setStatus('Interrumpido.');};
 useEffect(()=>()=>{abort.current?.abort();ttsAbort.current?.abort();player.current?.pause();mic.current?.getTracks().forEach(x=>x.stop());},[]);
 const test=async(q:string,endTime:number)=>{
  if(abort.current)return;
  const ctrl=new AbortController();abort.current=ctrl;
  setBusy(true);setStatus('Qwen respondiendo en streaming...');setAnswer('');setVoice('');setEngine('');
  const started=performance.now();
  let startedTts=false;
  try{
   const response=await fetch('/api/studio-realtime',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({persona,message:q}),signal:ctrl.signal});
   if(!response.ok||!response.body)throw new Error('Streaming HTTP '+response.status);
   const reader=response.body.getReader();const decoder=new TextDecoder();let pending='';
   while(true){
    const chunk=await reader.read();if(chunk.done)break;
    pending+=decoder.decode(chunk.value,{stream:true});
    let idx=pending.indexOf('\n');
    while(idx>=0){
     const raw=pending.slice(0,idx).trim();pending=pending.slice(idx+1);idx=pending.indexOf('\n');
     if(!raw)continue;
     let evt:Evt;try{evt=JSON.parse(raw) as Evt;}catch{continue}
     if(evt.type==='delta'&&evt.text){
      setAnswer(x=>x+evt.text);
      setTimes(x=>({...x,firstText:x.firstText??Math.round(performance.now()-started)}));
     }
     if(evt.type==='sentence'&&evt.text&&!startedTts){
      startedTts=true;
      const speech=new AbortController();ttsAbort.current=speech;
      const speechStarted=performance.now();
      const sentence=evt.text.slice(0,350);
      void (async()=>{
       try{
        setStatus('Primera frase lista. Generando voz local...');
        const result=await fetch('/api/studio-realtime-speech',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({persona,text:sentence}),signal:speech.signal});
        if(!result.ok){const error=await result.json() as {error?:string};throw new Error(error.error||'TTS HTTP '+result.status)}
        const blob=await result.blob();setTimes(x=>({...x,tts:Math.round(performance.now()-speechStarted)}));
        if(speech.signal.aborted)return;
        const url=URL.createObjectURL(blob);const audio=new Audio(url);player.current=audio;
        audio.onended=()=>{URL.revokeObjectURL(url);if(player.current===audio)player.current=null;};
        audio.onerror=()=>URL.revokeObjectURL(url);
        await audio.play();
        setVoice(result.headers.get('X-Voice')||'');
        setEngine(result.headers.get('X-TTS-Engine')||'Sin identificar');
        setTimes(x=>({...x,firstVoice:Math.round(performance.now()-endTime)}));
        setStatus('¡Bob/Lina hablando! Primer audio medido desde que terminaste tu pregunta.');
       }catch(e){if(!speech.signal.aborted)setStatus('Voz no disponible: '+String(e));}
       finally{if(ttsAbort.current===speech)ttsAbort.current=null;}
      })();
     }
     if(evt.type==='complete'){
      setTimes(x=>({...x,total:evt.total_ms??Math.round(performance.now()-started)}));
     }
     if(evt.type==='error')throw new Error(evt.message||'Error de Qwen');
    }
   }
  }catch(e){setStatus(ctrl.signal.aborted?'Respuesta interrumpida':'Error: '+String(e));}
  finally{if(abort.current===ctrl)abort.current=null;setBusy(false);}
 };
 const startMic=async()=>{
  if(recording||busy)return;
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
   mic.current=stream;const mime=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'audio/webm';
   const recorder=new MediaRecorder(stream,{mimeType:mime});rec.current=recorder;
   const chunks:Blob[]=[];
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=async()=>{
    const ended=performance.now();mark.current=ended;
    stream.getTracks().forEach(t=>t.stop());mic.current=null;rec.current=null;setRecording(false);
    setStatus('Whisper transcribiendo tu pregunta...');
    try{
     const form=new FormData();form.append('audio',new Blob(chunks,{type:mime}),'pregunta.webm');
     const response=await fetch('/api/studio-realtime-transcribe',{method:'POST',body:form});
     const data=await response.json() as {text?:string;error?:string};
     if(!response.ok||!data.text?.trim())throw new Error(data.error||'Whisper no reconoció audio');
     setTranscript(data.text);setTimes(x=>({...x,stt:Math.round(performance.now()-ended),firstText:null,firstVoice:null,total:null,tts:null}));
     await test(data.text,ended);
    }catch(e){setStatus('Whisper: '+String(e));}
   };
   recorder.start();setRecording(true);setStatus('Habla y pulsa «Terminé de hablar».');
  }catch(e){setStatus('Micrófono: '+String(e));}
 };
 return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-3xl space-y-5">
  <h1 className="text-2xl font-bold">Felencho Brain · Prueba de voz en tiempo real</h1>
  <p className="text-slate-300">Pregunta hablando. Medimos la espera hasta oír la primera palabra de Bob o Lina. Estudio principal y pantallas intactos.</p>
  <p className={worker==='ready'?'text-green-300':'text-amber-300'} role="status">
   Voz persistente 7894: {worker==='ready'?'Conectada':worker==='checking'?'Comprobando':'Desconectada — enciende el servidor TTS en la Terminal'}
  </p>
   <section className="space-y-3 rounded-xl bg-slate-900 p-4">
   <label className="block">Voz <select value={persona} disabled={recording||busy} onChange={e=>setPersona(e.target.value as Persona)} className="mt-1 w-full rounded bg-slate-800 p-2"><option value="bob">Bob · Ryan</option><option value="lina">Lina · Serena</option></select></label>
   <div className="flex flex-wrap gap-2">
    <button disabled={recording||busy||worker!=='ready'} onClick={()=>void startMic()} className="rounded bg-cyan-400 px-4 py-3 font-semibold text-black disabled:opacity-40">Preguntar con micrófono</button>
    <button disabled={!recording} onClick={()=>rec.current?.stop()} className="rounded bg-amber-400 px-4 py-3 font-semibold text-black disabled:opacity-40">Terminé de hablar</button>
    <button disabled={!busy} onClick={stop} className="rounded border px-4 py-3 disabled:opacity-40">Interrumpir</button>
   </div>
   <details><summary className="cursor-pointer text-sm">Prueba adicional por escrito</summary><textarea value={question} onChange={e=>setQuestion(e.target.value)} className="mt-2 w-full rounded bg-slate-800 p-2" rows={2}/><button disabled={busy||recording} onClick={()=>{setTranscript(question);setTimes({stt:null,firstText:null,firstVoice:null,total:null,tts:null});void test(question,performance.now())}} className="mt-2 rounded border px-3 py-2">Probar texto con voz</button></details>
  </section>
  <section className="space-y-3 rounded-xl bg-slate-900 p-4" aria-live="polite">
   <p>{status}</p>
   <div className="grid grid-cols-2 gap-3 text-sm">
    <div>Whisper <strong>{sec(times.stt)}</strong></div>
    <div>Primer texto Qwen <strong>{sec(times.firstText)}</strong></div>
    <div>Generar voz TTS <strong>{sec(times.tts)}</strong></div>
    <div className="text-cyan-300">Primera voz audible <strong>{sec(times.firstVoice)}</strong></div>
    <div>Qwen completo <strong>{sec(times.total)}</strong></div>
    <div>Voz utilizada <strong>{voice||'—'}</strong></div>
    <div>Motor TTS <strong>{engine||'—'}</strong></div>
   </div>
   <p className="text-sm">Whisper entendió: {transcript||'—'}</p>
   <p className="whitespace-pre-wrap text-sm">Respuesta: {answer||'—'}</p>
   <p className="text-xs text-slate-400">La primera voz audible mide inicio de reproducción en Chrome, no la primera muestra física del altavoz. La primera versión reproduce solo el primer fragmento, para medir la latencia sin sobrecargar la Mac.</p>
  </section>
 </div></main>;
}
