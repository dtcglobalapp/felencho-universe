'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room } from 'livekit-client';

type Persona = 'bob' | 'lina';
type Turn = {user: string; assistant: string};
const isLocal = () => typeof window !== 'undefined' && ['localhost','127.0.0.1'].includes(window.location.hostname);
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function classify(text: string, active: Persona | null) {
  // Whisper may return non-speech sound annotations; never send them to Qwen.
  const cleaned = normalize(text).trim();
  if (!cleaned || /^\s*[\[(].*[\])]\s*$/.test(text.trim()) ||
      /^(musica|motor|ruido|silencio|aplausos|sonido de la ventana|sonido del motor|subtitulos|gracias por ver)$/.test(cleaned)) {
    return {persona: null as Persona | null, command: 'ambient'};
  }
  const words = normalize(text).match(/[a-z0-9]+/g) || [];
  const bob = words.includes('bob'), lina = words.includes('lina');
  // If both cohosts are mentioned, the first name is the addressee.
  // Example: "Bob, preguntale a Lina..." must go to Bob, not be rejected.
  const firstBob = words.indexOf('bob'), firstLina = words.indexOf('lina');
  if (bob && lina) return {persona: (firstBob < firstLina ? 'bob' : 'lina') as Persona, command: 'question'};
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
  const [bridgeStatus,setBridgeStatus] = useState('Puente: sin comprobar');
  const [brainOnly,setBrainOnly] = useState(false);
  const [bobVoice,setBobVoice] = useState<'Uncle_Fu'|'Ryan'|'Aiden'|'Eric'|'Dylan'>('Uncle_Fu');

  const [turnMode,setTurnMode] = useState<'vad'|'manual'|'auto'>('vad');
  const [debateState,setDebateState] = useState('Mesa preparada: presenta un tema para iniciar el debate.');
  const [songTitle,setSongTitle] = useState('');
  const [songLyrics,setSongLyrics] = useState('');
  const [songStatus,setSongStatus] = useState('Sin letras cargadas en esta sesión');
  const [songCount,setSongCount] = useState(0);
  const [recording,setRecording] = useState(false);
  const [audioStatus,setAudioStatus] = useState('Voz todavía no probada');
  const [devices,setDevices] = useState<Array<{id:string;label:string}>>([]);
  const [selectedDevice,setSelectedDevice] = useState('');
  const [lastAudioUrl,setLastAudioUrl] = useState<string|null>(null);
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
  const vadCleanupRef = useRef<(() => void) | null>(null);
  const turnModeRef = useRef<'vad'|'manual'|'auto'>('vad');
  const microphoneRef = useRef<MediaStream | null>(null);
  const debateRef = useRef<{remaining:number;topic:string}|null>(null);
  const debateTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const interruptedRef = useRef(false);
  const activeRequestRef = useRef<AbortController|null>(null);
  const interruptionMonitorRef = useRef<(()=>void)|null>(null);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const publisherRef = useRef<Room | null>(null);
  const turnRef = useRef<Record<Persona, Turn[]>>({bob:[],lina:[]});
  const studioTranscriptRef = useRef<Array<{who:'Felencho'|'BOB'|'LINA';text:string}>>([]);

  const processRef = useRef<(text: string) => Promise<void>>(async () => {});
  const runningRef = useRef(false);
  useEffect(() => {
    if(navigator.mediaDevices?.enumerateDevices) {
      void navigator.mediaDevices.enumerateDevices().then(list=>setDevices(list.filter(d=>d.kind==='audioinput').map(d=>({id:d.deviceId,label:d.label||'Micrófono (permiso pendiente)'})))).catch(()=>{});
    }
    setLocalOk(isLocal());
    if(isLocal())void fetch('/api/studio-local-lyrics',{cache:'no-store'}).then(r=>r.json()).then((d:{count?:number})=>setSongCount(d.count||0)).catch(()=>{});
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
      setBridgeStatus('Puente conectado · '+persona.toUpperCase()+' '+action);
    }catch(e){setBridgeStatus('Puente visual desconectado: '+String(e));}
  },[]);

  const clearDebate = () => { debateRef.current=null; if(debateTimerRef.current)clearTimeout(debateTimerRef.current);debateTimerRef.current=null;setDebateState('Debate pausado; Felencho tiene la palabra.'); };
  const endPlayback = useCallback(() => {
    playerRef.current?.pause();
    playerRef.current?.dispatchEvent(new Event('ended'));
    playerRef.current = null;
  },[]);
  const stopRecognizer = () => {
    vadCleanupRef.current?.();vadCleanupRef.current=null;
    if(recorderRef.current?.state==='recording')recorderRef.current.stop();
    setRecording(false);
  };
  const finishTurn=()=>{vadCleanupRef.current?.();vadCleanupRef.current=null;if(recorderRef.current?.state==='recording')recorderRef.current.stop();setRecording(false);};
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
        let discardSilence=false;
        recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
        recorder.onstop=async()=>{
          vadCleanupRef.current?.();vadCleanupRef.current=null;
          if(recorderRef.current===recorder)recorderRef.current=null;
          setRecording(false);
          if(!liveRef.current||busyRef.current)return;
          if(discardSilence){setStatus('Esperando voz clara de Felencho...');setTimeout(()=>void processRef.current('__restart__'),150);return;}
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
        setRecording(true);
        if(turnModeRef.current==='vad'){
          setStatus('Escuchando en modo manos libres. Lina responderá cuando termines y haya una pausa natural.');
          // Browser-side acoustic detection only. No streaming audio leaves this Mac.
          // The microphone is never connected to the speakers (avoids feedback).
          const context=new AudioContext();
          const input=context.createMediaStreamSource(stream);
          const analyser=context.createAnalyser();
          analyser.fftSize=2048;
          input.connect(analyser);
          const samples=new Float32Array(analyser.fftSize);
          const started=Date.now();
          let speechMs=0,lastSound=0,lastTick=Date.now();
          const interval=setInterval(()=>{
            if(recorder.state!=='recording')return;
            analyser.getFloatTimeDomainData(samples);
            let total=0;
            for(let i=0;i<samples.length;i++)total+=samples[i]*samples[i];
            const rms=Math.sqrt(total/samples.length);
            const now=Date.now(),elapsed=Math.min(250,now-lastTick);
            lastTick=now;
            // Practical starting threshold for studio speech; manual mode remains available.
            if(rms>0.018){speechMs+=elapsed;lastSound=now;}
            // Require 350 ms accumulated speech and 1.8 s of quiet after it.
            if(speechMs>=350 && now-lastSound>=1800){
              finishTurn();
            } else if(now-started>=45000){
              if(speechMs<350)discardSilence=true;
              finishTurn();
            }
          },100);
          vadCleanupRef.current=()=>{clearInterval(interval);input.disconnect();void context.close().catch(()=>{});};
        } else if(turnModeRef.current==='auto'){
          setStatus('Escuchando localmente. Segmento automático de 18 segundos.');
          setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},18000);
        } else {
          setStatus('Escuchando tu intervención completa. Pulsa «Terminé de hablar» cuando quieras que responda.');
        }
      }catch(e){setStatus('No se pudo grabar: '+String(e));liveRef.current=false;setLive(false);}
      return;
    }
    const automatic = raw==='__debate__bob' ? 'bob' : raw==='__debate__lina' ? 'lina' : null;
    const handoff = raw==='__handoff__bob' ? 'bob' : raw==='__handoff__lina' ? 'lina' : null;
    const internal = automatic || handoff;
    const text=(automatic
       ? (automatic==='bob'
          ? 'Bob, continúa el debate reaccionando directamente al argumento más reciente de Lina. Aporta una idea nueva y una pregunta breve.'
          : 'Lina, continúa el debate reaccionando directamente al argumento más reciente de Bob. Aporta una perspectiva nueva y una pregunta breve.')
       : handoff
       ? (handoff==='bob'
          ? 'Bob, responde a lo que dijo Lina en la mesa. Aporta tu perspectiva brevemente.'
          : 'Lina, responde a lo que dijo Bob en la mesa. Aporta tu perspectiva brevemente.')
       : raw.trim()).slice(0,1200);
    if(!text || busyRef.current || !isLocal())return;
    if(!internal){
      interruptedRef.current=false;
      if(debateTimerRef.current)clearTimeout(debateTimerRef.current);
      debateTimerRef.current=null;
      const n=normalize(text);
      const startsDebate=/\\b(hablemos de|vamos a hablar|quiero hablar|el tema es|tema de hoy|debatan|conversen entre ustedes|discutan sobre|quiero que debatan|que opinan los dos)\\b/.test(n);
      if(startsDebate){debateRef.current={remaining:3,topic:text};setDebateState('Debate automático sobre el tema de Felencho: hasta cuatro intervenciones en total.');}
      else {debateRef.current=null;setDebateState('Mesa en escucha: esperando el próximo tema.');}
    }
    const routed=internal ? {persona:internal as Persona,command:'question'} : classify(text,activeRef.current);
    if(!internal && !routed.persona && debateRef.current)routed.persona='bob';
    if(routed.command==='ambient'){
      setStatus('Sonido ambiental ignorado. Esperando una pregunta dirigida a Bob o Lina.');
      if(liveRef.current)setTimeout(()=>void processRef.current('__restart__'),250);
      return;
    }
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
    if(!internal){
      studioTranscriptRef.current=[...studioTranscriptRef.current.slice(-15),{who:'Felencho',text}];
      setHistory(h=>[...h.slice(-18),{who:'Felencho',text}]);
    }
    setStatus('Consultando Felencho Brain para '+who.toUpperCase()+'...');
    await signal(who,'LISTENING');
    // A spoken request to one cohost to ask the other schedules exactly one
    // response from the second cohost. It is not an autonomous infinite loop.
    const spoken = normalize(text);
    const scheduledReply: Persona|null = !internal && (
      who==='bob' && /(?:preguntale|pregunta a|habla con|dirigete a|consulta a)\s+lina/.test(spoken) ? 'lina' :
      who==='lina' && /(?:preguntale|pregunta a|habla con|dirigete a|consulta a)\s+bob/.test(spoken) ? 'bob' :
      null
    );
    let answered=false;
    try{
      const controller=new AbortController();activeRequestRef.current=controller;
      const res=await fetch('/api/studio-local-conversation',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({character_key:who,message:text,conversation_context:turnRef.current[who].slice(-4),studio_transcript:(internal?studioTranscriptRef.current.slice(-12):studioTranscriptRef.current.slice(-12,-1)),autonomous_turn:!!automatic,bob_voice:bobVoice,include_audio:!brainOnly}),
        signal:controller.signal
      });
      const json=await res.json() as {data?:{text?:string;audio_base64?:string;audio_mime?:string;voice_engine?:string};error?:string};
      if(controller.signal.aborted || interruptedRef.current)return;
      if(!res.ok || !json.data?.text)throw new Error(json.error || 'Brain o voz sin respuesta. Verifica credenciales locales.');
      setReply(json.data.text);
      studioTranscriptRef.current=[...studioTranscriptRef.current.slice(-15),{who:who.toUpperCase() as 'BOB'|'LINA',text:json.data.text!}];
      setHistory(h=>[...h.slice(-18),{who:who.toUpperCase(),text:json.data!.text!}]);
      turnRef.current[who].push({user:text,assistant:json.data.text});
      turnRef.current[who]=turnRef.current[who].slice(-4);
      if(brainOnly){await signal(who,'IDLE');setAudioStatus('Voz desactivada: casilla «Probar solo cerebro Qwen» marcada');setStatus('Qwen local respondió correctamente. Voz no solicitada en esta prueba.');answered=true;return;}
      if(!json.data.audio_base64)throw new Error('Qwen local devolvió texto, pero el TTS local no generó audio.');
      const url=base64Audio(json.data.audio_base64,json.data.audio_mime || 'audio/mpeg');
      setAudioStatus('Audio generado por '+(json.data.voice_engine||'motor local')+'; preparando reproducción');
      if(lastAudioUrl) URL.revokeObjectURL(lastAudioUrl);
      const saved=base64Audio(json.data.audio_base64,json.data.audio_mime || 'audio/wav');
      setLastAudioUrl(saved);
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
        setAudioStatus('Reproduciendo '+(json.data.voice_engine||'voz local')+' · '+delivery);
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
      setAudioStatus('Reproducción finalizada · '+(json.data.voice_engine||'voz local'));
      answered=true;
    }catch(error){
      if(interruptedRef.current){await signal(who,'IDLE');return;}
      await signal(who,'IDLE');
      setStatus('Fallo de conversación: '+(error instanceof Error?error.message:String(error)));
      setAudioStatus('Error de generación o reproducción de voz; revisar Estado');
      // Avoid repeated local retries after failure; preserve resources.
      liveRef.current=false;setLive(false);
    }finally{
      activeRequestRef.current=null;
      busyRef.current=false;setBusy(false);
      if(answered && debateRef.current && !interruptedRef.current && !brainOnly && liveRef.current && debateRef.current.remaining>0){
        const next=who==='bob'?'lina':'bob';
        debateRef.current.remaining--;
        setDebateState('Debatiendo: '+next.toUpperCase()+' responderá a '+who.toUpperCase()+'. Restan '+debateRef.current.remaining+' turnos adicionales.');
        debateTimerRef.current=setTimeout(()=>{if(!busyRef.current && !interruptedRef.current && liveRef.current)void processRef.current('__debate__'+next);},250);
      } else if(answered && scheduledReply && !interruptedRef.current && liveRef.current){
        setStatus('Cediendo la palabra a '+scheduledReply.toUpperCase()+' por instrucción de Felencho.');
        setTimeout(()=>{if(!busyRef.current)void processRef.current('__handoff__'+scheduledReply);},400);
      } else if(liveRef.current && !interruptedRef.current) {
        setStatus('Escuchando: '+who.toUpperCase()+' conserva el turno. Puedes llamar al otro por su nombre.');
        setTimeout(()=>{if(liveRef.current && !busyRef.current && !recorderRef.current) void processRef.current('__restart__');},350);
      }
    }
  },[signal,brainOnly,bobVoice]);
  processRef.current=processText;

  const saveLyrics=async()=>{
    if(!songTitle.trim()||songLyrics.trim().length<30){setSongStatus('Introduce un título y la letra original completa.');return;}
    setSongStatus('Guardando letra únicamente en La Bestia...');
    try{
      const response=await fetch('/api/studio-local-lyrics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:songTitle,lyrics:songLyrics})});
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error||'No se pudo guardar la letra');
      setSongStatus('Letra guardada localmente; ahora puedes pedir a Bob o Lina que analicen esa canción.');
      setSongTitle('');setSongLyrics('');
      void fetch('/api/studio-local-lyrics',{cache:'no-store'}).then(r=>r.json()).then((d:{count?:number})=>setSongCount(d.count||0));
    }catch(error){setSongStatus('Error: '+String(error));}
  };
  const start=async()=> {
    if(!isLocal() || liveRef.current)return;
    try {
      microphoneRef.current=await navigator.mediaDevices.getUserMedia({audio:selectedDevice?{deviceId:{exact:selectedDevice},echoCancellation:true,noiseSuppression:true}:{echoCancellation:true,noiseSuppression:true},video:false});
      void navigator.mediaDevices.enumerateDevices().then(list=>setDevices(list.filter(d=>d.kind==='audioinput').map(d=>({id:d.deviceId,label:d.label||'Micrófono'})))).catch(()=>{});
      liveRef.current=true;setLive(true);setStatus('Micrófono habilitado: Whisper local.');
      await processRef.current('__restart__');
    }catch(e){setStatus('Permiso de micrófono o dispositivo: '+String(e));liveRef.current=false;setLive(false);}
  };
  const stop=()=>{clearDebate();interruptionMonitorRef.current?.();interruptionMonitorRef.current=null;activeRequestRef.current?.abort();liveRef.current=false;setLive(false);stopRecognizer();microphoneRef.current?.getTracks().forEach(t=>t.stop());microphoneRef.current=null;endPlayback();publisherRef.current?.disconnect();publisherRef.current=null;busyRef.current=false;setBusy(false);if(activeRef.current)void signal(activeRef.current,'IDLE');setStatus('Conversación pausada.');};
  useEffect(()=>()=>{liveRef.current=false;stopRecognizer();microphoneRef.current?.getTracks().forEach(t=>t.stop());playerRef.current?.pause();publisherRef.current?.disconnect();},[]);

  return <main className="min-h-screen bg-slate-950 p-5 text-slate-100">
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">Felencho Mundial · Conversación local</h1>
      <p className="text-sm text-slate-300">Consola privada del Mac. Las TVs solo muestran a Bob y Lina. No transmite al público. Qwen local + Whisper local + voces Qwen3-TTS Serena/Uncle_Fu (respaldo macOS): sin APIs comerciales.</p>
      {!localOk && <p className="rounded bg-red-950 p-3">Disponible solamente en localhost / 127.0.0.1.</p>}
      <section className="space-y-3 rounded-xl border border-cyan-500/40 bg-slate-900 p-4">
        <p className="text-xs text-amber-300">{bridgeStatus}</p>
        <p className="text-sm">Audio: {audioStatus}</p>
        <p className="text-sm">Mesa: {debateState}</p>
        {lastAudioUrl && <audio controls src={lastAudioUrl} className="w-full" aria-label="Reproducir la última voz de Bob o Lina" />}
        <label className="block text-sm">Entrada de voz (selecciona RØDECaster si aparece)
          <select disabled={live} className="mt-1 w-full rounded bg-slate-950 p-2" value={selectedDevice} onChange={e=>setSelectedDevice(e.target.value)}>
            <option value="">Micrófono predeterminado de macOS</option>
            {devices.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </label>
        <p className="text-sm text-amber-300">{readiness}</p>
        <p>Estado: <strong>{status}</strong></p>
        <p>Personaje activo: <strong>{active?.toUpperCase() || 'Ninguno'}</strong> · Micrófono: {live?'encendido':'apagado'} · Respuesta: {busy?'procesando':'libre'}</p>
        <label className="block text-sm">Voz masculina de Bob (pruebas; Lina permanece Serena)
          <select disabled={busy} value={bobVoice} onChange={e=>setBobVoice(e.target.value as typeof bobVoice)} className="mt-1 w-full rounded bg-slate-950 p-2">
            <option value="Uncle_Fu">Uncle_Fu · voz anterior</option>
            <option value="Ryan">Ryan · alternativa</option>
            <option value="Aiden">Aiden · alternativa</option>
            <option value="Eric">Eric · alternativa</option>
            <option value="Dylan">Dylan · alternativa</option>
          </select>
        </label>
        <p className="text-xs text-slate-400">Mesa automática: «Bob y Lina, hablemos de Historia de amor». Ellos intercambian argumentos, y tú recuperas la palabra al intervenir.</p>
        <label className="block text-sm">Final de turno
          <select disabled={live} value={turnMode} onChange={e=>{const next=e.target.value as 'vad'|'manual'|'auto';setTurnMode(next);turnModeRef.current=next;}} className="mt-1 w-full rounded bg-slate-950 p-2">
            <option value="vad">Manos libres: detectar silencio al terminar (recomendado)</option>
            <option value="manual">Yo indico cuándo terminé (entrevistas largas)</option>
            <option value="auto">Automático, cada 18 segundos (prueba)</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-3">
          {live && recording && (turnMode==='manual'||turnMode==='vad') && <button onClick={finishTurn} className="rounded bg-amber-400 px-4 py-3 font-semibold text-black">Terminé de hablar</button>}
          <button disabled={!localOk||live||busy} className="rounded bg-cyan-500 px-4 py-3 font-semibold text-black disabled:opacity-40" onClick={start}>Iniciar conversación</button>
          <button disabled={!live&&!busy} className="rounded border px-4 py-3 disabled:opacity-40" onClick={stop}>Detener conversación</button>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={brainOnly} onChange={e=>setBrainOnly(e.target.checked)} /> Probar solo cerebro Qwen (sin esperar voz)</label>
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
      <details className="rounded-xl border border-slate-700 bg-slate-900 p-4">
        <summary className="cursor-pointer font-semibold">Biblioteca local de letras originales ({songCount})</summary>
        <p className="mt-2 text-xs text-slate-400">Copia aquí únicamente letras originales de Felencho aprobadas. Se guardan en La Bestia, no se envían a servicios externos. Para corregir una canción vuelve a guardar el mismo título.</p>
        <input value={songTitle} onChange={e=>setSongTitle(e.target.value)} placeholder="Título exacto de la canción" className="mt-3 w-full rounded bg-slate-950 p-2" />
        <textarea value={songLyrics} onChange={e=>setSongLyrics(e.target.value)} placeholder="Pega aquí la letra original completa..." className="mt-2 min-h-48 w-full rounded bg-slate-950 p-2" />
        <button onClick={()=>void saveLyrics()} className="mt-2 rounded bg-cyan-500 px-4 py-2 font-semibold text-black">Guardar letra en La Bestia</button>
        <p className="mt-2 text-sm">{songStatus}</p>
      </details>
      <p className="text-xs text-slate-400">Sin APIs comerciales: Qwen local + Whisper local + voz integrada macOS; detección de pausas naturales, modo manual o segmentos de 18 segundos.</p>
      {reply && <p className="sr-only" aria-live="polite">{reply}</p>}
    </div>
  </main>;
}
