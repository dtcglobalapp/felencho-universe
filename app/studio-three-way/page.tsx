'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Persona = 'bob'|'lina';
type Entry = {who:'Felencho'|'BOB'|'LINA';text:string};
type AgentReply = {character_key:Persona;text:string;error?:string};
type SpeechReply = {audio_base64?:string;audio_mime?:string;voice?:string;error?:string};

const INTRO='Felencho, comenzamos. ¿De qué tema quieres que conversemos hoy?';
export default function ThreeWayDesk() {
  const [ready,setReady]=useState(false);
  const [brain,setBrain]=useState('');
  const [status,setStatus]=useState('Conectando con el cerebro local...');
  const [target,setTarget]=useState<'bob'|'lina'|'both'>('both');
  const [typed,setTyped]=useState('');
  const [entries,setEntries]=useState<Entry[]>([]);
  const [busy,setBusy]=useState(false);
  const [recording,setRecording]=useState(false);
  const [audioOn,setAudioOn]=useState(true);
  const transcript=useRef<Entry[]>([]);
  const recorder=useRef<MediaRecorder|null>(null);
  const microphone=useRef<MediaStream|null>(null);
  const currentAudio=useRef<HTMLAudioElement|null>(null);
  const busyRef=useRef(false);
  useEffect(()=>{
    void fetch('/api/studio-three-way',{cache:'no-store'})
      .then(async r=>{const j=await r.json();setReady(!!j.ready);setBrain(j.brain||'');setStatus(j.ready?'Mesa preparada: tú diriges el debate.':(j.error||'Cerebro 3001 no preparado'));})
      .catch(()=>setStatus('No se pudo contactar al estudio.'));
    return ()=>{
      recorder.current?.stop();
      microphone.current?.getTracks().forEach(t=>t.stop());
      currentAudio.current?.pause();
    };
  },[]);
  const add=(entry:Entry)=>{
    transcript.current=[...transcript.current,entry].slice(-40);
    setEntries([...transcript.current]);
  };
  const playback=useCallback(async(encoded:string)=>{
    if (!audioOn)return;
    const raw=atob(encoded);
    const bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    const url=URL.createObjectURL(new Blob([bytes],{type:'audio/wav'}));
    const sound=new Audio(url);
    currentAudio.current=sound;
    try{
      await new Promise<void>((resolve,reject)=>{
        sound.onended=()=>resolve();
        sound.onerror=()=>reject(new Error('No se pudo reproducir la voz.'));
        void sound.play().catch(reject);
      });
    } finally {
      if(currentAudio.current===sound)currentAudio.current=null;
      URL.revokeObjectURL(url);
    }
  },[audioOn]);
  const speakTo=async(who:Persona,message:string)=>{
    setStatus('Brain local: preparando respuesta de '+(who==='bob'?'Bob':'Lina')+'...');
    const context=transcript.current.filter(x=>x.who===(who==='bob'?'BOB':'LINA')).slice(-4).map(x=>({
      user:message,assistant:x.text
    }));
    const brainRes=await fetch('/api/studio-three-way',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({character_key:who,message,conversation_context:context,studio_transcript:transcript.current.slice(-12)})
    });
    const answer=await brainRes.json() as AgentReply;
    if(!brainRes.ok||!answer.text)throw new Error(answer.error||'Sin respuesta de Brain');
    add({who:who==='bob'?'BOB':'LINA',text:answer.text});
    if(!audioOn){setStatus('Texto listo (audio desactivado)');return}
    setStatus('Generando voz oficial de '+(who==='bob'?'Bob':'Lina')+'...');
    const voiceRes=await fetch('/api/studio-voice-preview',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({persona:who,text:answer.text.slice(0,320)})
    });
    const voice=await voiceRes.json() as SpeechReply;
    if(!voiceRes.ok||!voice.audio_base64)throw new Error(voice.error||'La voz no está disponible');
    setStatus('Hablando '+(who==='bob'?'Bob':'Lina')+'...');
    await playback(voice.audio_base64);
  };
  const submit=async(value:string)=>{
    if(busyRef.current||!ready||!value.trim())return;
    busyRef.current=true;setBusy(true);
    const text=value.trim().slice(0,1200);
    setTyped('');
    add({who:'Felencho',text});
    try{
      if(target==='both'){
        await speakTo('bob',text);
        await speakTo('lina','Felencho preguntó: '+text+' Responde brevemente al punto de Bob antes de aportar tu perspectiva.');
      }else await speakTo(target,text);
      setStatus('Turno terminado. Felencho tiene la palabra.');
    }catch(err){
      setStatus('Error de turno: '+(err instanceof Error?err.message:'desconocido'));
    } finally {
      busyRef.current=false;setBusy(false);
    }
  };
  const startMic=async()=>{
    if(busyRef.current||recording)return;
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      microphone.current=stream;
      const type=MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':'';
      const rec=new MediaRecorder(stream,type?{mimeType:type}:undefined);
      recorder.current=rec;
      const chunks:Blob[]=[];
      rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
      rec.onstop=async()=>{
        setRecording(false);
        stream.getTracks().forEach(t=>t.stop());
        microphone.current=null;
        recorder.current=null;
        const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});
        if(blob.size<100){setStatus('No se grabó audio');return}
        setBusy(true);busyRef.current=true;
        setStatus('Whisper local: transcribiendo tu voz...');
        try {
          const form=new FormData();form.set('audio',blob,'felencho.webm');
          const res=await fetch('/api/studio-three-way-transcribe',{method:'POST',body:form});
          const data=await res.json() as {text?:string;error?:string};
          if(!res.ok)throw new Error(data.error||'Whisper no disponible');
          if(!data.text?.trim())throw new Error('No se reconoció ninguna frase');
          setTyped(data.text);
          setStatus('Transcripción preparada. Pulsa Enviar para dar la palabra.');
        }catch(err){setStatus('Transcripción: '+(err instanceof Error?err.message:'error'))}
        finally{busyRef.current=false;setBusy(false)}
      };
      rec.start();
      setRecording(true);
      setStatus('Grabando a Felencho. Pulsa Detener al terminar.');
    }catch(err){setStatus('Micrófono: '+(err instanceof Error?err.message:'no disponible'))}
  };
  const stopMic=()=>{if(recorder.current?.state==='recording')recorder.current.stop()};
  const interrupt=()=>{
    currentAudio.current?.pause();
    currentAudio.current=null;
    setStatus('Audio pausado. El turno actual puede continuar preparando texto.');
  };
  const controlStyle={border:'1px solid #466384',background:'#18334d',borderRadius:9,color:'#eff8ff',padding:'12px 16px',cursor:'pointer'};
  return <main style={{minHeight:'100vh',background:'#080e1b',color:'#edf6ff',padding:'24px',fontFamily:'system-ui,sans-serif'}}>
    <div style={{maxWidth:960,margin:'auto'}}>
      <h1 style={{margin:'0 0 8px'}}>Felencho Mundial · Mesa de tres</h1>
      <p style={{color:'#a8bcd4'}}>Felencho dirige · Bob habla con Qwen3 Base aprobado · Lina conserva Serena.</p>
      <p style={{color:'#9fe5c4'}} role="status">{status}</p>
      <p style={{color:'#93a8bd',fontSize:13}}>Brain: {brain||'Sin confirmar'} · Panel aislado 3121 · Audio solo en este navegador · Sin LiveKit ni publicación a las pantallas.</p>
      <section style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10,margin:'18px 0'}}>
        {(['FELENCHO','BOB','LINA'] as const).map(who=><div key={who} style={{padding:16,border:'1px solid #34516c',borderRadius:12,textAlign:'center',background:'#112033'}}><strong>{who}</strong><p style={{fontSize:13,color:'#b3c5da'}}>{who==='FELENCHO'?'Director de la conversación':who==='BOB'?'Voz oficial clonada':'Serena'}</p></div>)}
      </section>
      <section style={{border:'1px solid #304761',borderRadius:12,background:'#111e30',padding:16}}>
        <h2 style={{fontSize:19,marginTop:0}}>Conversación</h2>
        <div aria-live="polite" style={{maxHeight:380,minHeight:180,overflowY:'auto',borderRadius:9,background:'#081423',padding:12}}>
          {entries.length===0?<p style={{color:'#92aac4'}}>{INTRO}</p>:entries.map((entry,i)=><div key={i} style={{padding:'9px 0',borderBottom:'1px solid #263b54'}}><strong style={{color:entry.who==='Felencho'?'#e8cf91':entry.who==='BOB'?'#85b7ff':'#e2a4ed'}}>{entry.who}: </strong><span>{entry.text}</span></div>)}
        </div>
        <fieldset disabled={busy||recording} style={{border:0,padding:0,margin:'18px 0'}}>
          <legend style={{marginBottom:8}}>¿A quién le das la palabra?</legend>
          <div style={{display:'flex',gap:15,flexWrap:'wrap'}}>
            <label><input type="radio" checked={target==='bob'} onChange={()=>setTarget('bob')}/> Bob</label>
            <label><input type="radio" checked={target==='lina'} onChange={()=>setTarget('lina')}/> Lina</label>
            <label><input type="radio" checked={target==='both'} onChange={()=>setTarget('both')}/> Bob y después Lina</label>
          </div>
        </fieldset>
        <label htmlFor="studio-input">Tu intervención</label>
        <textarea id="studio-input" value={typed} onChange={e=>setTyped(e.target.value)}
          rows={3} maxLength={1200}
          style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:8,padding:12,borderRadius:8,fontSize:17,color:'#17243a',background:'white'}}
          placeholder="Felencho, introduce un tema o pregunta a Bob y Lina..." />
        <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:12,alignItems:'center'}}>
          <button style={controlStyle} disabled={busy||recording||!ready||!typed.trim()} onClick={()=>void submit(typed)}>Enviar y conversar</button>
          <button style={controlStyle} disabled={busy} onClick={()=>recording?stopMic():void startMic()}>{recording?'Detener micrófono':'Grabar mi voz'}</button>
          <button style={controlStyle} onClick={interrupt}>Silenciar reproducción</button>
          <label style={{display:'flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={audioOn} onChange={e=>setAudioOn(e.target.checked)} disabled={busy}/> Audio activado</label>
        </div>
        <p style={{fontSize:13,color:'#b9acc4'}}>Micrófono con Whisper local en 3001. Revisa la transcripción y pulsa Enviar. Ningún audio se publica por LiveKit. No uses altavoces duplicados durante una emisión.</p>
      </section>
    </div>
  </main>
}
