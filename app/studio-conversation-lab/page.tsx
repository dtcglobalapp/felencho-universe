'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room } from 'livekit-client';

type Persona = 'bob' | 'lina';
type Turn = {user: string; assistant: string};
const isLocal = () => typeof window !== 'undefined' && ['localhost','127.0.0.1'].includes(window.location.hostname);
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function classify(text: string, active: Persona | null) {
  const words = normalize(text).match(/[a-z0-9]+/g) || [];
  const bob = words.includes('bob'), lina = words.includes('lina');
  if (bob && lina) return {persona: null as Persona | null, command: 'ambiguous'};
  const persona: Persona | null = bob ? 'bob' : lina ? 'lina' : active;
  if (!persona) return {persona: null as Persona | null, command: 'unaddressed'};
  const sleeping = /\b(a dormir|duerme|descansa|vete a dormir)\b/.test(normalize(text));
  return {persona, command: sleeping ? 'sleep' : 'question'};
}
const base64Audio = (encoded: string, mime: string) => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], {type:mime || 'audio/mpeg'}));
};

export default function StudioConversationLab() {
  const [status,setStatus] = useState('Pulsa Iniciar conversación para permitir el micrófono local.');
  const [live,setLive] = useState(false);
  const [busy,setBusy] = useState(false);
  const [active,setActive] = useState<Persona | null>(null);
  const [transcript,setTranscript] = useState('');
  const [reply,setReply] = useState('');
  const [typed,setTyped] = useState('');
  const [history,setHistory] = useState<{who: string; text: string}[]>([]);
  const [localOk,setLocalOk] = useState(false);
  const [readiness,setReadiness] = useState('Comprobando motor Qwen local y voz macOS...');
  const activeRef = useRef<Persona | null>(null);
  const liveRef = useRef(false);
  const busyRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const publisherRef = useRef<Room | null>(null);
  const turnRef = useRef<Record<Persona, Turn[]>>({bob:[],lina:[]});
  const processRef = useRef<(text: string) => Promise<void>>(async () => {});
  const runningRef = useRef(false);
  useEffect(() => {
    setLocalOk(isLocal());
    if(!isLocal())return;
    fetch('/api/studio-local-conversation',{cache:'no-store'}).then(r=>r.json()).then((j:{ready?:boolean;brain?:string;tts?:string})=>{
      setReadiness(j.ready?'Motor listo: '+j.brain+' · '+j.tts:'Falta iniciar un servidor Qwen local (Ollama, LM Studio o MLX). Voz macOS disponible.');
    }).catch(()=>setReadiness('No se pudo detectar Qwen local.'));
  },[]);

  const signal = useCallback(async(persona: Persona,action:'LISTENING'|'SLEEP'|'SPEAKING'|'IDLE')=>{
    if(!isLocal()) return;
    try{
      const response = await fetch('http://127.0.0.1:7891/wake',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({target:persona,action}),
        signal:AbortSignal.timeout(2500)
      });
      if(!response.ok) throw new Error('HTTP '+response.status);
    }catch(e){setStatus('Puente visual desconectado: '+String(e));}
  },[]);

  const endPlayback = useCallback(() => {
    playerRef.current?.pause();
    playerRef.current?.dispatchEvent(new Event('ended'));
    playerRef.current = null;
  },[]);
  const stopRecognizer = () => {
    if(recorderRef.current?.state==='recording')recorderRef.current.stop();
  };
  const resumeListening = () => {
    busyRef.current = false;setBusy(false);
    if(liveRef.current) {
      setStatus('Escuchando. Di Bob o Lina para dirigir una pregunta.');
      setTimeout(() => {
        if(liveRef.current && !busyRef.current && !recorderRef.current) processRef.current('__restart__');
      },250);
    }
  };

  const processText = useCallback(async (raw: string) => {
    if (raw === '__restart__') {
      if(!liveRef.current || busyRef.current || recorderRef.current) return;
      const stream=microphoneRef.current;
      if(!stream){setStatus('Micrófono no disponible');liveRef.current=false;setLive(false);return;}
      try {
        const recorder=new MediaRecorder(stream,{mimeType:'audio/webm'});
        recorderRef.current=recorder;
        const chunks:Blob[]=[];
        recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
        recorder.onstop=async()=>{
          if(recorderRef.current===recorder)recorderRef.current=null;
          if(!liveRef.current||busyRef.current)return;
          try{
            const blob=new Blob(chunks,{type:'audio/webm'});
            if(!blob.size)throw new Error('Segmento sin audio');
            const data=new FormData();data.append('audio',blob,'voice.webm');
            setStatus('Whisper local: transcribiendo...');
            const res=await fetch('/api/studio-local-transcribe',{method:'POST',body:data,signal:AbortSignal.timeout(65000)});
            const json=await res.json() as {text?:string;error?:string};
            if(!res.ok)throw new Error(json.error||'Falló Whisper');
            const phrase=(json.text||'').trim();
            if(phrase){setTranscript(phrase);await processRef.current(phrase);}
            else if(liveRef.current&&!busyRef.current) setTimeout(()=>void processRef.current('__restart__'),100);
          }catch(e){
            setStatus('Whisper local: '+String(e));liveRef.current=false;setLive(false);
            microphoneRef.current?.getTracks().forEach(t=>t.stop());microphoneRef.current=null;
          }
        };
        recorder.start();
        setStatus('Escuchando localmente (segmento de 6 segundos).');
        setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},6000);
      }catch(e){setStatus('No se pudo grabar: '+String(e));liveRef.current=false;setLive(false);}
      return;
    }
    const text=raw.trim().slice(0,1200);
    if(!text || busyRef.current || !isLocal())return;
    const routed=classify(text,activeRef.current);
    if(routed.command==='ambiguous'){setStatus('Nombraste a Bob y Lina juntos. Llama a uno para tomar su turno.');if(liveRef.current)setTimeout(()=>void processRef.current('__restart__'),250);return;}
    if(!routed.persona){setStatus('No hay personaje activo. Empieza diciendo Bob o Lina.');if(liveRef.current)setTimeout(()=>void processRef.current('__restart__'),250);return;}
    const who=routed.persona;
    if(routed.command==='sleep'){
      activeRef.current = null;setActive(null);
      await signal(who,'SLEEP');setStatus(who.toUpperCase()+' dormido. Llama a Bob o Lina para continuar.');
      if(liveRef.current)setTimeout(()=>void processRef.current('__restart__'),250);
      return;
    }
    activeRef.current=who;setActive(who);
    busyRef.current=true;setBusy(true);
    stopRecognizer();
    setHistory(h=>[...h.slice(-12),{who:'Felencho',text}]);
    setStatus('Consultando Felencho Brain para '+who.toUpperCase()+'...');
    await signal(who,'LISTENING');
    try{
      const res=await fetch('/api/studio-local-conversation',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({character_key:who,message:text,conversation_context:turnRef.current[who].slice(-4)}),
        signal:AbortSignal.timeout(90000)
      });
      const json=await res.json() as {data?:{text?:string;audio_base64?:string;audio_mime?:string};error?:string};
      if(!res.ok || !json.data?.text)throw new Error(json.error || 'Brain o voz sin respuesta. Verifica credenciales locales.');
      setReply(json.data.text);
      setHistory(h=>[...h.slice(-12),{who:who.toUpperCase(),text:json.data!.text!}]);
      turnRef.current[who].push({user:text,assistant:json.data.text});
      turnRef.current[who]=turnRef.current[who].slice(-4);
      if(!json.data.audio_base64)throw new Error('Qwen local devolvió texto, pero el TTS local no generó audio.');
      const url=base64Audio(json.data.audio_base64,json.data.audio_mime || 'audio/mpeg');
      const player=new Audio(url);playerRef.current=player;
      let ctx: AudioContext | null=null;
      let publishedTrack: MediaStreamTrack | null=null;
      let publishedRoom: Room | null=null;
      let delivery = 'solo salida local';
      try {
        // Send the same actual audio samples to both Mac output and the LiveKit
        // portrait receiver, rather than merely toggling a visual SPEAKING flag.
        try {
          const response=await fetch('/api/studio-local-publisher',{cache:'no-store'});
          const credentials=await response.json() as {server?:string;token?:string;error?:string};
          if(!response.ok||!credentials.token||!credentials.server)throw new Error(credentials.error || 'Sin token');
          if(!publisherRef.current){
            const room=new Room();
            await room.connect(credentials.server,credentials.token);
            publisherRef.current=room;
          }
          publishedRoom=publisherRef.current;
          ctx=new AudioContext();
          await ctx.resume();
          const src=ctx.createMediaElementSource(player);
          const destination=ctx.createMediaStreamDestination();
          src.connect(destination);
          src.connect(ctx.destination);
          publishedTrack=destination.stream.getAudioTracks()[0];
          await publishedRoom.localParticipant.publishTrack(publishedTrack,{
            name:who==='bob'?'bob-studio-brain-voice':'serena-studio-brain-voice'
          });
          delivery='LiveKit y salida local';
        } catch(error) {
          setStatus('Voz local disponible; envío LiveKit no listo: '+String(error));
          if(ctx) {await ctx.close().catch(()=>{});ctx=null;}
          publishedTrack=null;publishedRoom=null;
        }
        await signal(who,'SPEAKING');
        setStatus(who.toUpperCase()+' hablando ('+delivery+'). Reconocimiento pausado.');
        await new Promise<void>((resolve,reject)=>{
          player.onended=()=>resolve();
          player.onerror=()=>reject(new Error('Fallo al reproducir audio generado'));
          void player.play().catch(reject);
        });
      } finally{
        if(publishedTrack&&publishedRoom) {
          await publishedRoom.localParticipant.unpublishTrack(publishedTrack).catch(()=>{});
          publishedTrack.stop();
        }
        if(ctx) await ctx.close().catch(()=>{});
        playerRef.current=null;
        URL.revokeObjectURL(url);
      }
      await signal(who,'IDLE');
    }catch(error){
      setStatus('Fallo de conversación: '+(error instanceof Error?error.message:String(error)));
      await signal(who,'IDLE');
      // Avoid repeated local retries after failure; preserve resources.
      liveRef.current=false;setLive(false);
    }finally{
      busyRef.current=false;setBusy(false);
      if(liveRef.current) {
        setStatus('Escuchando: '+who.toUpperCase()+' conserva el turno. Puedes llamar al otro por su nombre.');
        setTimeout(()=>{if(liveRef.current && !busyRef.current && !speechRef.current) void processRef.current('__restart__');},350);
      }
    }
  },[signal]);
  processRef.current=processText;

  const start=async()=> {
    if(!isLocal() || liveRef.current)return;
    try {
      microphoneRef.current=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
      liveRef.current=true;setLive(true);setStatus('Micrófono habilitado: Whisper local.');
      await processRef.current('__restart__');
    }catch(e){setStatus('Permiso de micrófono o dispositivo: '+String(e));liveRef.current=false;setLive(false);}
  };
  const stop=()=>{liveRef.current=false;setLive(false);stopRecognizer();microphoneRef.current?.getTracks().forEach(t=>t.stop());microphoneRef.current=null;endPlayback();publisherRef.current?.disconnect();publisherRef.current=null;busyRef.current=false;setBusy(false);if(activeRef.current)void signal(activeRef.current,'IDLE');setStatus('Conversación pausada.');};
  useEffect(()=>()=>{liveRef.current=false;stopRecognizer();microphoneRef.current?.getTracks().forEach(t=>t.stop());playerRef.current?.pause();publisherRef.current?.disconnect();},[]);

  return <main className="min-h-screen bg-slate-950 p-5 text-slate-100">
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">Felencho Mundial · Conversación local</h1>
      <p className="text-sm text-slate-300">Consola privada del Mac. Las TVs solo muestran a Bob y Lina. No transmite al público. Qwen local + Whisper local + voces Qwen3-TTS Serena/Uncle_Fu (respaldo macOS): sin APIs comerciales.</p>
      {!localOk && <p className="rounded bg-red-950 p-3">Disponible solamente en localhost / 127.0.0.1.</p>}
      <section className="space-y-3 rounded-xl border border-cyan-500/40 bg-slate-900 p-4">
        <p className="text-sm text-amber-300">{readiness}</p>
        <p>Estado: <strong>{status}</strong></p>
        <p>Personaje activo: <strong>{active?.toUpperCase() || 'Ninguno'}</strong> · Micrófono: {live?'encendido':'apagado'} · Respuesta: {busy?'procesando':'libre'}</p>
        <div className="flex flex-wrap gap-3">
          <button disabled={!localOk||live||busy} className="rounded bg-cyan-500 px-4 py-3 font-semibold text-black disabled:opacity-40" onClick={start}>Iniciar conversación</button>
          <button disabled={!live&&!busy} className="rounded border px-4 py-3 disabled:opacity-40" onClick={stop}>Detener conversación</button>
        </div>
        <p className="text-xs text-slate-400">Ejemplo: «Lina, ¿cómo estás?»; después «¿qué opinas de Nueva York?»; «Lina, a dormir»; «Bob, buenos días».</p>
        <form onSubmit={e=>{e.preventDefault();if(typed.trim()){void processText(typed);setTyped('');}}} className="flex gap-2">
          <input className="min-w-0 flex-1 rounded bg-slate-950 p-2" value={typed} onChange={e=>setTyped(e.target.value)} placeholder="O escribe una pregunta para probar Brain..." aria-label="Pregunta"/>
          <button className="rounded bg-slate-700 px-4 py-2 disabled:opacity-40" disabled={!localOk||busy}>Enviar</button>
        </form>
      </section>
      <section className="space-y-2 rounded-xl bg-slate-900 p-4">
        <h2 className="font-semibold">Conversación reciente</h2>
        <p className="text-xs text-slate-400">Última transcripción: {transcript || '(sin transcripción)'}</p>
        {history.map((h,i)=><p key={i} className="border-b border-slate-700 py-2 text-sm"><strong>{h.who}:</strong> {h.text}</p>)}
        {!history.length&&<p className="text-slate-400">Sin intervenciones todavía.</p>}
      </section>
      <p className="text-xs text-slate-400">Sin APIs comerciales: Qwen local + Whisper local + voz integrada macOS; los intervalos de reconocimiento son de 6 segundos.</p>
      {reply && <p className="sr-only" aria-live="polite">{reply}</p>}
    </div>
  </main>;
}
