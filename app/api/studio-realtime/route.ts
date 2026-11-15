import { NextRequest, NextResponse } from 'next/server';
import { STUDIO_FELENCHO_FACTS } from '@/lib/studioLocalKnowledge';
import { loadStudioScience } from '@/lib/studioScienceLibrary';
import { recallStudioFacts } from '@/lib/studioApprovedMemory';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Persona='bob'|'lina';
type Line={who:'Felencho'|'BOB'|'LINA';text:string};
const encoder=new TextEncoder();
const local=(req:NextRequest)=>process.env.NODE_ENV==='development'&&
  ['localhost:3001','127.0.0.1:3001','localhost:3002','127.0.0.1:3002'].includes(req.headers.get('host')||'');
const rules:Record<Persona,string>={
 bob:'Eres Bob, coanfitrion de Felencho Mundial. Habla con la serenidad y autoridad de un juez veterano, palabras naturales, humor sobrio. Escucha y respeta al presentador. No anuncies tu nombre.',
 lina:'Eres Lina, coanfitriona de Felencho Mundial, analista social calida y rigurosa. Escucha y respeta al presentador. No anuncies tu nombre.'
};
async function model(signal:AbortSignal){
 const res=await fetch('http://127.0.0.1:11434/api/tags',{signal,cache:'no-store'});
 if(!res.ok)throw new Error('Ollama no responde');
 const data=await res.json() as {models?:Array<{name?:string}>};
 const pick=data.models?.find(x=>/qwen.*instruct/i.test(x.name||''))||
   data.models?.find(x=>/qwen/i.test(x.name||'')&&!/tts|embed|rerank/i.test(x.name||''));
 if(!pick?.name)throw new Error('No se encontró Qwen local');
 return pick.name;
}
export async function POST(req:NextRequest){
 if(!local(req))return NextResponse.json({error:'Solo laboratorio local'},{status:403});
 let input:{persona?:Persona;message?:string;history?:Line[]};
 try{input=await req.json() as typeof input;}catch{return NextResponse.json({error:'JSON inválido'},{status:400})}
 if((input.persona!=='bob'&&input.persona!=='lina')||typeof input.message!=='string'||
   input.message.trim().length<3||input.message.length>1200)
   return NextResponse.json({error:'Petición inválida'},{status:400});
 const persona=input.persona,question=input.message.trim();
 const history=Array.isArray(input.history)?input.history.slice(-10).filter((x):x is Line=>
   !!x&&['Felencho','BOB','LINA'].includes(x.who)&&typeof x.text==='string'&&x.text.length<=700):[];
 const started=performance.now();
 const stream=new ReadableStream<Uint8Array>({
  async start(controller){
   let finished=false;
   const send=(event:Record<string,unknown>)=>{if(!finished)controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));};
   const abort=new AbortController();
   const onAbort=()=>abort.abort();
   req.signal.addEventListener('abort',onAbort,{once:true});
   const timer=setTimeout(onAbort,35000);
   try{
    const chosen=await model(abort.signal);
    const science=loadStudioScience(question);
    const memory=await recallStudioFacts(question+' '+history.slice(-4).map(x=>x.text).join(' '));
    const messages=[
     {role:'system',content:[rules[persona],'Contesta en español con dos frases naturales. No inventes datos actuales ni anuncies búsquedas que no hiciste. No introduzcas canciones, videoclips ni detalles personales de Felencho cuando no tengan relación directa con la pregunta. Responde sin fórmulas de presentación.',STUDIO_FELENCHO_FACTS,science,memory].filter(Boolean).join('\n\n')},
     ...history.map(x=>({role:x.who.toLowerCase()===persona?'assistant':'user',content:x.who+': '+x.text})),
     {role:'user',content:'Felencho: '+question}
    ];
    const res=await fetch('http://127.0.0.1:11434/api/chat',{
     method:'POST',signal:abort.signal,headers:{'Content-Type':'application/json'},
     body:JSON.stringify({model:chosen,messages,stream:true,keep_alive:'30m',options:{num_predict:110,temperature:0.4}})
    });
    if(!res.ok||!res.body)throw new Error('Qwen HTTP '+res.status);
    send({type:'ready',model:chosen});
    const reader=res.body.getReader(),decoder=new TextDecoder();
    let buffer='',full='',pending='',first:number|null=null;
    while(true){
      const item=await reader.read();if(item.done)break;
      buffer+=decoder.decode(item.value,{stream:true});
      let pos=buffer.indexOf('\n');
      while(pos>=0){
        const line=buffer.slice(0,pos).trim();buffer=buffer.slice(pos+1);
        if(line){
          let parsed:{message?:{content?:string}};
          try{parsed=JSON.parse(line) as typeof parsed;}catch{parsed={}}
          const delta=parsed.message?.content||'';
          if(delta){
            if(first===null)first=Math.round(performance.now()-started);
            full+=delta;pending+=delta;
            send({type:'delta',text:delta});
            const match=pending.match(/^[\s\S]*?[.!?](?=\s|$)/);
            if(match&&match[0].trim().length>=10){send({type:'sentence',text:match[0].trim()});pending=pending.slice(match[0].length).trimStart();}
          }
        }
        pos=buffer.indexOf('\n');
      }
    }
    if(pending.trim())send({type:'sentence',text:pending.trim()});
    send({type:'complete',text:full.trim(),first_token_ms:first,total_ms:Math.round(performance.now()-started),model:chosen});
   }catch(e){
    send({type:'error',message:abort.signal.aborted?'Cancelado o superó 35 segundos':e instanceof Error?e.message:String(e)});
   }finally{
    clearTimeout(timer);req.signal.removeEventListener('abort',onAbort);
    finished=true;controller.close();
   }
  }
 });
 return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Accel-Buffering':'no'}});
}
