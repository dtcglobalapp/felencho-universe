'use client';
import { useEffect, useRef, useState } from 'react';

type Persona='bob'|'lina';
type EventData={type:string;text?:string;model?:string;first_token_ms?:number|null;total_ms?:number;message?:string};
const sample='Explica la diferencia entre neuronas y celulas gliales con un ejemplo sencillo.';
export default function RealtimeLab(){
 const [persona,setPersona]=useState<Persona>('bob');
 const [question,setQuestion]=useState(sample);
 const [status,setStatus]=useState('Preparado para medir el motor progresivo.');
 const [answer,setAnswer]=useState('');
 const [sentences,setSentences]=useState<string[]>([]);
 const [first,setFirst]=useState<number|null>(null);
 const [total,setTotal]=useState<number|null>(null);
 const [model,setModel]=useState('');
 const [busy,setBusy]=useState(false);
 const [cancelMs,setCancelMs]=useState<number|null>(null);
 const controllerRef=useRef<AbortController|null>(null);
 const startRef=useRef(0);
 const run=async()=>{
   if(controllerRef.current)return;
   const controller=new AbortController();controllerRef.current=controller;
   const started=performance.now();startRef.current=started;
   setBusy(true);setStatus('Conectando con Qwen local...');setAnswer('');
   setSentences([]);setFirst(null);setTotal(null);setCancelMs(null);setModel('');
   try{
     const response=await fetch('/api/studio-realtime',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({persona,message:question}),signal:controller.signal
     });
     if(!response.ok)throw new Error('HTTP '+response.status+': '+await response.text());
     if(!response.body)throw new Error('Servidor sin streaming');
     const reader=response.body.getReader(),decode=new TextDecoder();
     let pending='';
     while(true){
       const {done,value}=await reader.read();if(done)break;
       pending+=decode.decode(value,{stream:true});
       let idx=pending.indexOf('\n');
       while(idx>=0){
         const line=pending.slice(0,idx).trim();pending=pending.slice(idx+1);
         if(line){
           let data:EventData;
           try{data=JSON.parse(line) as EventData;}catch{data={type:'invalid'};}
           if(data.type==='ready'){setModel(data.model||'');setStatus('Qwen generando texto progresivamente...');}
           if(data.type==='delta'&&data.text){setAnswer(x=>x+data.text);setFirst(x=>x??Math.round(performance.now()-started));}
           if(data.type==='sentence'&&data.text)setSentences(x=>[...x,data.text!]);
           if(data.type==='complete'){
             setTotal(data.total_ms??Math.round(performance.now()-started));
             setStatus('Prueba terminada. La voz todavía no está conectada a este laboratorio.');
           }
           if(data.type==='error')throw new Error(data.message||'Error en generación');
         }
         idx=pending.indexOf('\n');
       }
     }
   }catch(error){
     setStatus(controller.signal.aborted?'Cancelado por Felencho.':'Fallo: '+String(error));
   }finally{
     if(controllerRef.current===controller)controllerRef.current=null;
     setBusy(false);
   }
 };
 const cancel=()=>{
  if(!controllerRef.current)return;
  setCancelMs(Math.round(performance.now()-startRef.current));
  controllerRef.current.abort();
  setStatus('Cancelando la respuesta...');
 };
 useEffect(()=>()=>{controllerRef.current?.abort();},[]);
 return <main className="min-h-screen bg-slate-950 text-white p-6">
  <div className="mx-auto max-w-3xl space-y-5">
   <h1 className="text-2xl font-bold">Felencho Brain · Realtime Lab</h1>
   <p className="text-slate-300">Laboratorio independiente. No modifica voces, pantallas, LiveKit ni la consola de producción. Prueba de texto progresivo y cancelación.</p>
   <section className="rounded-xl bg-slate-900 p-4 space-y-4">
    <label className="block">Personaje
     <select disabled={busy} value={persona} onChange={e=>setPersona(e.target.value as Persona)}
       className="mt-1 w-full rounded bg-slate-800 p-2">
      <option value="bob">Bob · personalidad sobria</option>
      <option value="lina">Lina · analista social</option>
     </select>
    </label>
    <label className="block">Pregunta de ensayo
     <textarea disabled={busy} value={question} onChange={e=>setQuestion(e.target.value)}
      className="mt-1 w-full rounded bg-slate-800 p-3" rows={3}/>
    </label>
    <div className="flex gap-3">
      <button disabled={busy||question.trim().length<3} onClick={()=>void run()} className="rounded bg-cyan-500 px-4 py-3 font-semibold text-black disabled:opacity-40">Probar streaming</button>
      <button disabled={!busy} onClick={cancel} className="rounded border px-4 py-3 disabled:opacity-40">Interrumpir respuesta</button>
    </div>
   </section>
   <section className="rounded-xl bg-slate-900 p-4 space-y-3" aria-live="polite">
    <h2 className="text-lg font-semibold">Mediciones</h2>
    <p>{status}</p>
    <div className="grid grid-cols-2 gap-2 text-sm">
     <p>Primer fragmento: <strong>{first===null?'—':first+' ms'}</strong></p>
     <p>Respuesta completa: <strong>{total===null?'—':total+' ms'}</strong></p>
     <p>Cancelación solicitada: <strong>{cancelMs===null?'—':cancelMs+' ms desde inicio'}</strong></p>
     <p>Modelo: <strong>{model||'—'}</strong></p>
    </div>
    <h3 className="font-semibold">Texto recibido</h3>
    <p className="whitespace-pre-wrap text-slate-200">{answer||'Aún sin respuesta'}</p>
    <h3 className="font-semibold">Fragmentos listos para futura voz</h3>
    {sentences.map((s,i)=><p className="border-l-2 border-cyan-600 pl-2 text-sm" key={i}>{s}</p>)}
   </section>
  </div>
 </main>;
}
