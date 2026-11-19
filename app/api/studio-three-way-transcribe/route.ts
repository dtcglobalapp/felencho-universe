import { NextRequest, NextResponse } from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest) {
  if (process.env.NODE_ENV!=='development' ||
      process.env.FELENCHO_VOICE_PREVIEW!=='1' ||
      !['127.0.0.1:3121','localhost:3121'].includes(request.headers.get('host')||'')) {
    return NextResponse.json({error:'Solo laboratorio local'}, {status:403});
  }
  try {
    const data=await request.formData();
    const audio=data.get('audio');
    if (!(audio instanceof File)||audio.size<100||audio.size>12_000_000)
      return NextResponse.json({error:'Grabación inválida o demasiado larga'}, {status:400});
    const form=new FormData();
    form.set('audio',audio,'producer.webm');
    const response=await fetch('http://127.0.0.1:3001/api/studio-local-transcribe',{
      method:'POST',body:form,signal:AbortSignal.timeout(65000),cache:'no-store',
    });
    const result=await response.json() as {text?:unknown;error?:unknown};
    if (!response.ok) return NextResponse.json({error:typeof result.error==='string'?result.error:'Whisper local no disponible'}, {status:502});
    return NextResponse.json({text:typeof result.text==='string'?result.text.slice(0,1200):''}, {headers:{'Cache-Control':'no-store'}});
  }catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:'Error de transcripción'}, {status:502});
  }
}
