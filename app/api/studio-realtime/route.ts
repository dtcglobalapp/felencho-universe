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
    // Personal song background is retrieved only for relevant music questions.
    // Supplying a long artist biography on every topic made Qwen repeatedly
    // introduce "Historia de amor" into unrelated philosophical questions.
    const musicTopic=/\\b(cancion|canciones|musica|musical|video(?:clip)?|letra|letras|historia de amor|miriam|discografia|album|compositor|felencho records)\\b/i
      .test(question.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase());
    const studioContext=musicTopic?STUDIO_FELENCHO_FACTS:
      'CONTEXTO DEL ESTUDIO: Felencho conduce el podcast Felencho Mundial junto a Bob y Lina. Smart es el arquitecto tecnico. Habla sobre el tema consultado sin introducir canciones ni historias personales.';
    const messages=[
     {role:'system',content:[rules[persona],
      'Contesta en español con dos frases naturales, sin presentarte. No inventes datos actuales ni búsquedas. No introduzcas canciones ni videoclips si no son relevantes. Si preguntan sobre relaciones entre humanos y máquinas, reconoce la diversidad de experiencias afectivas sin descalificar como anormal a nadie; diferencia las emociones humanas, las capacidades de la tecnología y las cuestiones legales o éticas.',
      studioContext,science,memory].filter(Boolean).join('\\n\\n')},
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
            // Speak the first complete short clause sooner; preserve the
            // natural sentence boundary for subsequent chunks.
            const comma=pending.match(/^[\\s\\S]*?[,;:](?=\\s)/);
            const sentence=pending.match(/^[\\s\\S]*?[.!?](?=\\s|$)/);
            const early=comma&&comma[0].trim().length>=35&&comma[0].trim().length<=145
              &&comma[0].trim().split(/\\s+/).length>=7 ? comma:null;
            const match=early||sentence;
            if(match&&match[0].trim().length>=10){
              send({type:'sentence',text:match[0].trim()});
              pending=pending.slice(match[0].length).trimStart();
            }
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
