import { NextRequest, NextResponse } from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Persona='bob'|'lina';
type State='IDLE'|'LISTENING'|'THINKING'|'SPEAKING'|'WATCHING';
export async function POST(request:NextRequest) {
  const host=request.headers.get('host')||'';
  if(process.env.NODE_ENV!=='development' ||
     process.env.FELENCHO_VOICE_PREVIEW!=='1' ||
     !['127.0.0.1:3121','localhost:3121'].includes(host))
    return NextResponse.json({error:'Vista de laboratorio no disponible'},{status:403});
  try{
    const data=await request.json() as {target?:Persona;action?:State};
    if(!['bob','lina'].includes(String(data.target)) ||
       !['IDLE','LISTENING','THINKING','SPEAKING','WATCHING'].includes(String(data.action)))
      return NextResponse.json({error:'Evento visual inválido'},{status:400});
    const upstream=await fetch('http://127.0.0.1:7891/wake',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({target:data.target,action:data.action}),
      signal:AbortSignal.timeout(2200),
      cache:'no-store'
    });
    if(!upstream.ok) return NextResponse.json({error:'Puente visual no aceptó el evento'},{status:502});
    return NextResponse.json({ok:true,target:data.target,action:data.action});
  }catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:'Sin conexión visual'},{status:502});
  }
}
