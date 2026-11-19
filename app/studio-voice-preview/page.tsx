'use client';

import { useEffect, useState } from 'react';

type Persona = 'bob'|'lina';
type VoiceResult = { audio_base64:string; audio_mime:string; voice:string; tts_ms:number };
const EXAMPLES: Record<Persona,string> = {
  bob: 'Felencho, bienvenidos a nuestro estudio. Estoy preparado para conversar contigo y con Lina.',
  lina: 'Hola, Felencho. Aquí estoy, preparada para analizar las noticias contigo y con Bob.',
};

export default function VoiceScreenPreview() {
  const [status, setStatus] = useState('Comprobando motores locales...');
  const [persona, setPersona] = useState<Persona>('bob');
  const [text, setText] = useState(EXAMPLES.bob);
  const [working, setWorking] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  useEffect(() => {
    fetch('/api/studio-voice-preview', {cache:'no-store'})
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Vista no habilitada en este puerto')))
      .then(() => setStatus('Voces listas para ensayo aislado'))
      .catch((error:Error) => setStatus(error.message));
  }, []);
  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
  }, [audioUrl]);
  const choose = (next:Persona) => {
    setPersona(next);
    setText(EXAMPLES[next]);
    setDetails('');
    setAudioUrl(null);
  };
  const generate = async () => {
    if (working) return;
    setWorking(true);
    setAudioUrl(null);
    setDetails('Generando ' + (persona==='bob'?'Bob':'Lina') + ' localmente...');
    try {
      const response = await fetch('/api/studio-voice-preview', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({persona,text}),
      });
      const data = await response.json() as Partial<VoiceResult> & {error?:string};
      if (!response.ok || !data.audio_base64) throw new Error(data.error ?? 'Sin audio');
      const binary = atob(data.audio_base64);
      const bytes = new Uint8Array(binary.length);
      for (let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
      setAudioUrl(URL.createObjectURL(new Blob([bytes],{type:'audio/wav'})));
      setDetails(data.voice + ' · ' + ((data.tts_ms ?? 0)/1000).toFixed(2) + ' s de síntesis');
    } catch(error) {
      setDetails(error instanceof Error ? error.message : 'Error generando audio');
    } finally {
      setWorking(false);
    }
  };
  const panel: React.CSSProperties = {background:'#111c2d',border:'1px solid #30425e',borderRadius:16,padding:16};
  return <main style={{minHeight:'100vh',background:'#070e1b',color:'#f2f6ff',padding:'24px',fontFamily:'system-ui,sans-serif'}}>
    <header style={{margin:'0 auto 18px',maxWidth:1280}}>
      <h1 style={{fontSize:30,margin:'0 0 8px'}}>Felencho Mundial · Bob y Lina</h1>
      <p style={{color:'#b0bdd4',margin:0}}>Pantalla de voces listas — laboratorio aislado. Sin LiveKit, sin emisión, sin modificaciones al estudio activo.</p>
      <p role="status" style={{color:'#99d8bb'}}>{status}</p>
    </header>
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16,maxWidth:1280,margin:'auto'}}>
      <div style={panel}>
        <h2 style={{marginTop:0}}>BOB · voz oficial</h2>
        <div style={{height:380,overflow:'hidden',borderRadius:12,background:'#01050c'}}>
          <iframe title="Holograma Bob aprobado" src="http://127.0.0.1:3118/studio-light/bob?dev=1"
            style={{width:'100%',height:'100%',border:0}} />
        </div>
        <p style={{color:'#b0bdd4'}}>Motor Qwen3 Base 1.7B · referencia protegida</p>
      </div>
      <div style={panel}>
        <h2 style={{marginTop:0}}>LINA · Serena</h2>
        <div style={{height:380,overflow:'hidden',borderRadius:12,background:'#01050c'}}>
          <iframe title="Holograma Lina aprobado" src="http://127.0.0.1:3118/studio-light/lina?dev=1"
            style={{width:'100%',height:'100%',border:0}} />
        </div>
        <p style={{color:'#b0bdd4'}}>Serena CustomVoice · sin cambios</p>
      </div>
    </section>
    <section style={{...panel,maxWidth:1248,margin:'18px auto 0'}}>
      <h2 style={{marginTop:0}}>Ensayo de voces — sonido solamente en este navegador</h2>
      <div style={{display:'flex',gap:12,marginBottom:14}}>
        <button type="button" onClick={()=>choose('bob')} style={{padding:'10px 24px',borderRadius:9,border:0,background:persona==='bob'?'#5f9cf3':'#28364d',color:'white'}}>Bob</button>
        <button type="button" onClick={()=>choose('lina')} style={{padding:'10px 24px',borderRadius:9,border:0,background:persona==='lina'?'#5f9cf3':'#28364d',color:'white'}}>Lina</button>
      </div>
      <label htmlFor="voice-text">Texto de prueba</label>
      <textarea id="voice-text" value={text} maxLength={320} onChange={event=>setText(event.target.value)}
        rows={3} style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:7,background:'#f7f9fc',color:'#14223a',borderRadius:8,padding:12,fontSize:17}} />
      <button onClick={generate} disabled={working||!text.trim()} style={{padding:'12px 22px',borderRadius:9,marginTop:14,background:'#4b8df0',border:0,color:'white',fontSize:16,cursor:'pointer'}}>
        {working?'Generando...':'Generar voz de '+(persona==='bob'?'Bob':'Lina')}
      </button>
      <p role="status" style={{color:'#b0bdd4'}}>{details}</p>
      {audioUrl && <audio src={audioUrl} controls style={{width:'100%',maxWidth:560}} />}
      <p style={{color:'#d6c6a3',fontSize:13}}>El audio NO se publica a LiveKit ni se envía a las pantallas. Para evitar duplicaciones, deja silenciado el navegador si la RØDECaster está transmitiendo.</p>
    </section>
  </main>;
}
