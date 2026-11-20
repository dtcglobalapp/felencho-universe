import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GATE = 'FELENCHO_VOICE_PREVIEW';
function permitted(request:NextRequest) {
  return process.env.NODE_ENV === 'development'
    && process.env[GATE] === '1'
    && ['127.0.0.1:3121','localhost:3121'].includes(request.headers.get('host') ?? '');
}
type Persona = 'bob'|'lina';
type Turn = {user:string;assistant:string};
type StudioLine = {who:'Felencho'|'BOB'|'LINA';text:string};

export async function GET(req:NextRequest) {
  if (!permitted(req)) return NextResponse.json({error:'Laboratorio desactivado'}, {status:403});
  try {
    const res=await fetch('http://127.0.0.1:3001/api/studio-local-conversation',{
      cache:'no-store',signal:AbortSignal.timeout(5500)
    });
    const data=await res.json();
    return NextResponse.json({ready:res.ok && data.ready===true,brain:data.brain || null,voice:'Bob Base / Serena (3121)',source:'3001'});
  }catch {
    return NextResponse.json({ready:false,error:'El cerebro de 3001 no responde'}, {status:503});
  }
}
export async function POST(req:NextRequest) {
  if (!permitted(req)) return NextResponse.json({error:'Laboratorio desactivado'}, {status:403});
  try {
    const data=await req.json() as {
      character_key?:Persona;
      message?:string;
      conversation_context?:Turn[];
      studio_transcript?:StudioLine[];
    };
    if (data.character_key!=='bob' && data.character_key!=='lina') {
      return NextResponse.json({error:'Solo Bob o Lina'}, {status:400});
    }
    if (typeof data.message!=='string' || data.message.trim().length<1 || data.message.length>1200) {
      return NextResponse.json({error:'Intervención debe tener 1-1200 caracteres'}, {status:400});
    }
    const context=Array.isArray(data.conversation_context)
      ? data.conversation_context.slice(-4).filter(x=>typeof x?.user==='string' && typeof x?.assistant==='string').map(x=>({
        user:x.user.slice(0,1200),assistant:x.assistant.slice(0,1200)
      })) : [];
    const transcript=Array.isArray(data.studio_transcript)
      ? data.studio_transcript.slice(-12).filter(x=>['Felencho','BOB','LINA'].includes(x?.who) && typeof x?.text==='string').map(x=>({
        who:x.who,text:x.text.slice(0,1200)
      })) : [];
    // Reuse existing guarded local brain, but never trigger Dylan or Serena on 3001.
    const res=await fetch('http://127.0.0.1:3001/api/studio-local-conversation',{
      method:'POST',cache:'no-store',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        character_key:data.character_key,
        message:data.message.trim(),
        conversation_context:context,
        studio_transcript:transcript,
        include_audio:false,
        autonomous_turn:false
      }),
      signal:AbortSignal.timeout(55000)
    });
    const result=await res.json() as {data?:{text?:unknown;backend?:unknown};error?:unknown};
    if (!res.ok) return NextResponse.json({error:typeof result.error==='string'?result.error:'Cerebro 3001 no disponible'}, {status:502});
    const text=result.data?.text;
    if (typeof text!=='string' || !text.trim()) {
      return NextResponse.json({error:'Cerebro devolvió respuesta vacía'}, {status:502});
    }
    return NextResponse.json({character_key:data.character_key,text:text.slice(0,1200),backend:result.data?.backend,voice_engine:'separado en 3121'},
      {headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:'Error del laboratorio'}, {status:502});
  }
}
