'use client';
import {useEffect,useRef,useState} from 'react';

type Persona='bob'|'lina';
type EventData={type:string;text?:string;model?:string;total_ms?:number;message?:string};
type Metrics={stt:number|null;firstText:number|null;tts:number|null;firstVoice:number|null;total:number|null;segments:number;longestGap:number|null};
const zero=():Metrics=>({stt:null,firstText:null,tts:null,firstVoice:null,total:null,segments:0,longestGap:null});
const seconds=(n:number|null)=>n===null?'—':(n/1000).toFixed(2)+' s';
const source='/api/studio-realtime-speech';

export default function RealtimeLab(){
 const [persona,setPersona]=useState<Persona>('bob');
 const [question,setQuestion]=useState('¿Qué es más importante en la vida, el dinero o la sabiduría?');
 const [transcript,setTranscript]=useState('');
 const [reply,setReply]=useState('');
 const [status,setStatus]=useState('Prueba oral completa. Los hologramas no reciben audio.');
 const [recording,setRecording]=useState(false);
 const [working,setWorking]=useState(false);
 const [speaking,setSpeaking]=useState(false);
 const [worker,setWorker]=useState<'checking'|'ready'|'offline'>('checking');
 const [interruptEnabled,setInterruptEnabled]=useState(false);
 const [interruptStatus,setInterruptStatus]=useState('No activado');
 const [metrics,setMetrics]=useState<Metrics>(zero);
 const [voice,setVoice]=useState('');
 const [segmentTexts,setSegmentTexts]=useState<string[]>([]);
 const recorder=useRef<MediaRecorder|null>(null);
 const micStream=useRef<MediaStream|null>(null);
 const playback=useRef<HTMLAudioElement|null>(null);
 const workAbort=useRef<AbortController|null>(null);
 const speechAbort=useRef<AbortController|null>(null);
 const liveMonitor=useRef<(()=>void)|null>(null);
 const generation=useRef(0);
 const workingRef=useRef(false);
 const speakingRef=useRef(false);
 const selected=useRef<Persona>('bob');
 selected.current=persona;
 const cancel=()=>{
   generation.current++;
   workAbort.current?.abort();speechAbort.current?.abort();
   playback.current?.pause();playback.current=null;
   workAbort.current=null;speechAbort.current=null;
   workingRef.current=false;speakingRef.current=false;
   setWorking(false);setSpeaking(false);
   setStatus('Interrupción: respuesta y reproducción detenidas.');
 };
 const checkWorker=async()=>{
   try{
    const result=await fetch(source,{cache:'no-store',signal:AbortSignal.timeout(2000)});
    const value=await result.json() as {ready?:boolean};
    setWorker(value.ready?'ready':'offline');
   }catch{setWorker('offline')}
 };
 useEffect(()=>{
   void checkWorker();
   const timer=setInterval(()=>void checkWorker(),5000);
   return()=>{clearInterval(timer);generation.current++;workAbort.current?.abort();speechAbort.current?.abort();playback.current?.pause();liveMonitor.current?.();micStream.current?.getTracks().forEach(x=>x.stop());};
 },[]);
 // Voice barge-in: isolated studio mic is essential. Do not react to ambient
 // sound when no agent is playing. This VAD does not identify Felencho.
 useEffect(()=>{
  if(!interruptEnabled){liveMonitor.current?.();liveMonitor.current=null;setInterruptStatus('Desactivado');return;}
  let dead=false;let destroy:()=>void=()=>{};
  void (async()=>{
   try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:false}});
    if(dead){stream.getTracks().forEach(t=>t.stop());return;}
    const ctx=new AudioContext(),src=ctx.createMediaStreamSource(stream);
    const analyzer=ctx.createAnalyser();analyzer.fftSize=1024;src.connect(analyzer);
    const samples=new Float32Array(analyzer.fftSize);
    let floor=0.004,hold=0,last=performance.now(),warm=performance.now();
    const tick=()=>{
     analyzer.getFloatTimeDomainData(samples);
     let power=0;for(const v of samples)power+=v*v;
     const rms=Math.sqrt(power/samples.length);
     const now=performance.now(),dt=Math.min(now-last,100);last=now;
     if(!speakingRef.current){floor=0.95*floor+0.05*rms;hold=0;}
     else if(now-warm>700){
       const threshold=Math.max(0.02,floor*4);
       hold=rms>threshold?hold+dt:Math.max(0,hold-dt*1.5);
       if(hold>=320){hold=0;cancel();setInterruptStatus('Interrupción detectada por micrófono');}
     }
     animation=requestAnimationFrame(tick);
    };
    let animation=requestAnimationFrame(tick);
    destroy=()=>{cancelAnimationFrame(animation);src.disconnect();analyzer.disconnect();void ctx.close();stream.getTracks().forEach(t=>t.stop());};
    liveMonitor.current=destroy;
    setInterruptStatus('Escuchando micrófono durante reproducción (VAD experimental)');
   }catch(e){setInterruptStatus('Micrófono de interrupción no disponible: '+String(e));}
  })();
  return()=>{dead=true;destroy();if(liveMonitor.current===destroy)liveMonitor.current=null;};
 },[interruptEnabled]);
 const sendQuestion=async(q:string,endedAt:number,sttMs:number|null)=>{
  if(workingRef.current)return;
  const epoch=++generation.current;workingRef.current=true;setWorking(true);
  setReply('');setStatus('Qwen generando texto progresivo...');setMetrics({...zero(),stt:sttMs});setVoice('');setSegmentTexts([]);
  const ctrl=new AbortController();workAbort.current=ctrl;
  const began=performance.now();
  const pending:Promise<{audio:Blob,voice:string,ms:number,text:string}>[]=[];
  let queued=0,startedPlayback=false,voiceWait=0,voiceTotal=0,lastEnd:number|null=null,longest=0;
  const isCurrent=()=>epoch===generation.current&&!ctrl.signal.aborted;
  const enqueue=(text:string)=>{
   if(!isCurrent()||!text.trim()||queued>=8)return;
   queued++;
   const speechCtrl=new AbortController();
   // Limit to one synthetic audio job at a time and respect order.
   const previous=pending[pending.length-1];
   const promise=(async()=>{
     if(previous)await previous.catch(()=>null);
     if(!isCurrent())throw new Error('cancelado');
     speechAbort.current=speechCtrl;
     const start=performance.now();
     try{
      const response=await fetch(source,{method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({persona:selected.current,text:text.slice(0,350)}),
       signal:AbortSignal.any([ctrl.signal,speechCtrl.signal])});
      if(!response.ok){
       const details=await response.json() as {error?:string};
       throw new Error(details.error||'TTS HTTP '+response.status);
      }
      const audio=await response.blob();
      return {audio,voice:response.headers.get('X-Voice')||'',ms:Math.round(performance.now()-start),text};
     }finally{if(speechAbort.current===speechCtrl)speechAbort.current=null;}
   })();
   void promise.catch(()=>{}); // The consumer may await this after later streaming events.
   pending.push(promise);
   setSegmentTexts(v=>[...v,text]);
  };
  try{
   const response=await fetch('/api/studio-realtime',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({persona,message:q}),signal:ctrl.signal});
   if(!response.ok||!response.body)throw new Error('Qwen HTTP '+response.status);
   const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
   while(isCurrent()){
    const part=await reader.read();if(part.done)break;
    buffer+=decoder.decode(part.value,{stream:true});
    let index=buffer.indexOf('\n');
    while(index>=0){
     const raw=buffer.slice(0,index).trim();buffer=buffer.slice(index+1);index=buffer.indexOf('\n');
     if(!raw)continue;
     let event:EventData;
     try{event=JSON.parse(raw) as EventData;}catch{continue;}
     if(event.type==='delta'&&event.text){
       setReply(v=>v+event.text);
       setMetrics(v=>({...v,firstText:v.firstText??Math.round(performance.now()-began)}));
     }
     if(event.type==='sentence'&&event.text)enqueue(event.text);
     if(event.type==='complete')setMetrics(v=>({...v,total:event.total_ms??Math.round(performance.now()-began)}));
     if(event.type==='error')throw new Error(event.message||'Error de generación');
    }
   }
   // Play synthesized chunks in order. TTS for the next chunk can run while
   // the current chunk plays, but the worker still processes only one job.
   for(const item of pending){
     if(!isCurrent())break;
     const segment=await item;
     if(!isCurrent())break;
     voiceTotal+=segment.ms;setVoice(segment.voice);
     const url=URL.createObjectURL(segment.audio);
     const audio=new Audio(url);playback.current=audio;
     try{
      await new Promise<void>((resolve,reject)=>{
       let settled=false;
       const finish=(e?:Error)=>{if(settled)return;settled=true;clearTimeout(timeout);e?reject(e):resolve();};
       const timeout=setTimeout(()=>finish(new Error('Audio sin finalizar')),40000);
       audio.onended=()=>finish();
       audio.onerror=()=>finish(new Error('Error al reproducir audio'));
       void audio.play().then(()=>{
        if(!isCurrent()){audio.pause();finish();return;}
        const time=performance.now();
        if(!startedPlayback){
         startedPlayback=true;voiceWait=time-endedAt;
         setMetrics(v=>({...v,firstVoice:Math.round(voiceWait)}));
        } else if(lastEnd!==null){longest=Math.max(longest,time-lastEnd);setMetrics(v=>({...v,longestGap:Math.round(longest)}));}
        speakingRef.current=true;setSpeaking(true);
        setStatus('Respuesta hablada en curso · fragmento '+(segmentTexts.length||queued));
       }).catch(err=>finish(err instanceof Error?err:new Error(String(err))));
      });
     }finally{
      speakingRef.current=false;setSpeaking(false);lastEnd=performance.now();
      URL.revokeObjectURL(url);if(playback.current===audio)playback.current=null;
     }
     setMetrics(v=>({...v,segments:v.segments+1,tts:Math.round(voiceTotal)}));
   }
   if(isCurrent())setStatus('Respuesta oral completa · '+queued+' fragmentos de voz.');
  }catch(err){
   if(isCurrent())setStatus('Error de prueba: '+String(err));
  }finally{
   if(workAbort.current===ctrl)workAbort.current=null;
   if(isCurrent()){speakingRef.current=false;setSpeaking(false);workingRef.current=false;setWorking(false);}
  }
 };
 const startMic=async()=>{
  if(recording||workingRef.current)return;
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
   micStream.current=stream;
   const mime=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'audio/webm';
   const r=new MediaRecorder(stream,{mimeType:mime});recorder.current=r;
   const chunks:Blob[]=[];r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   r.onstop=async()=>{
    const ended=performance.now();stream.getTracks().forEach(t=>t.stop());micStream.current=null;setRecording(false);
    setStatus('Whisper transcribiendo tu pregunta...');
    try{
     const form=new FormData();form.append('audio',new Blob(chunks,{type:mime}),'pregunta.webm');
     const response=await fetch('/api/studio-realtime-transcribe',{method:'POST',body:form});
     const payload=await response.json() as {text?:string;error?:string};
     if(!response.ok||!payload.text?.trim())throw new Error(payload.error||'Whisper sin transcripción');
     setTranscript(payload.text);
     await sendQuestion(payload.text,ended,Math.round(performance.now()-ended));
    }catch(e){setStatus('Whisper: '+String(e));}
   };
   r.start();setRecording(true);setStatus('Haz tu pregunta y pulsa «Terminé de hablar».');
  }catch(e){setStatus('Micrófono: '+String(e));}
 };
 return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-3xl space-y-5">
  <h1 className="text-2xl font-bold">Felencho Brain · Realtime Lab</h1>
  <p className="text-sm text-slate-300">Prueba aislada: pregunta hablada, respuesta completa fragmentada y prioridad del micrófono de Felencho. No modifica hologramas ni LiveKit.</p>
  <p className={worker==='ready'?'text-green-300':'text-amber-300'}>Servidor Qwen3-TTS 7894: {worker==='ready'?'Conectado':worker==='checking'?'Comprobando':'Desconectado'}</p>
  <section className="space-y-3 rounded-xl bg-slate-900 p-4">
   <label className="block text-sm">Coanfitrión
    <select value={persona} disabled={working||recording} onChange={e=>setPersona(e.target.value as Persona)} className="mt-1 w-full rounded bg-slate-800 p-2">
     <option value="bob">Bob · Ryan</option><option value="lina">Lina · Serena</option>
    </select></label>
   <div className="flex flex-wrap gap-2">
    <button disabled={working||recording||worker!=='ready'} onClick={()=>void startMic()} className="rounded bg-cyan-400 px-4 py-3 font-semibold text-black disabled:opacity-50">Preguntar con micrófono</button>
    <button disabled={!recording} onClick={()=>recorder.current?.stop()} className="rounded bg-amber-400 px-4 py-3 font-semibold text-black disabled:opacity-50">Terminé de hablar</button>
    <button disabled={!working} onClick={cancel} className="rounded border px-4 py-3 disabled:opacity-50">Interrumpir</button>
   </div>
   <label className="flex items-center gap-2 text-sm">
    <input type="checkbox" checked={interruptEnabled} onChange={e=>setInterruptEnabled(e.target.checked)}/>
    Interrumpir automáticamente cuando detecte mi voz (experimental; requiere micrófono sin retorno del TTS)
   </label>
   <p className="text-xs text-slate-400">{interruptStatus}</p>
   <details><summary className="cursor-pointer text-sm">Prueba adicional escrita</summary>
    <textarea value={question} onChange={e=>setQuestion(e.target.value)} rows={2} className="mt-2 w-full rounded bg-slate-800 p-2"/>
    <button disabled={working||recording||worker!=='ready'} onClick={()=>{setTranscript(question);void sendQuestion(question,performance.now(),null);}} className="mt-2 rounded border px-3 py-2">Probar texto con audio completo</button>
   </details>
  </section>
  <section className="space-y-3 rounded-xl bg-slate-900 p-4" aria-live="polite">
   <p>{status}</p>
   <div className="grid grid-cols-2 gap-3 text-sm">
    <p>Whisper: <strong>{seconds(metrics.stt)}</strong></p>
    <p>Primer texto Qwen: <strong>{seconds(metrics.firstText)}</strong></p>
    <p>Tiempo total TTS: <strong>{seconds(metrics.tts)}</strong></p>
    <p>Primera voz audible: <strong>{seconds(metrics.firstVoice)}</strong></p>
    <p>Qwen completo: <strong>{seconds(metrics.total)}</strong></p>
    <p>Fragmentos reproducidos: <strong>{metrics.segments}</strong></p>
    <p>Mayor pausa entre fragmentos: <strong>{seconds(metrics.longestGap)}</strong></p>
    <p>Voz: <strong>{voice||'—'}</strong></p>
   </div>
   <p className="text-sm text-slate-300">Whisper entendió: {transcript||'—'}</p>
   <p className="whitespace-pre-wrap text-sm">Respuesta: {reply||'—'}</p>
   <details><summary className="cursor-pointer text-xs">Fragmentos enviados al sintetizador</summary><ol className="list-inside list-decimal text-xs">{segmentTexts.map((t,i)=><li key={i}>{t}</li>)}</ol></details>
   <p className="text-xs text-slate-400">La medición de voz comienza al llamar a play() en Chrome; no incluye la latencia física del altavoz. La interrupción acústica es una prueba de actividad de sonido, no identifica personas; usar canal de micrófono aislado en la RØDECaster.</p>
  </section>
 </div></main>;
}
